/**
 * Recovery Counter logic.
 *
 * Computes the user's currently open and historically recovered opportunity
 * gaps from raw account, transaction, benefits, and profile data. The output
 * feeds two surfaces: the /api/user/recovery route (live read) and the
 * backfill script (one-time historical credit).
 *
 * Each gap has a stable id so that recoveries can be persisted in the
 * RecoveryEvent table without double-recording. Year-scoped gaps (IRA, HSA)
 * embed the calendar year in their id so the same user can recover the same
 * lever in multiple years.
 */

import type {
  Account,
  Budget,
  EmploymentBenefits,
  Holding,
  OnboardingProfile,
  Transaction,
} from '@prisma/client'
import type { PrismaClient } from '@prisma/client'

import { crossCheckBenefits, type ExtractedBenefits } from '@/lib/benefitsAnalysis'
import { normalizeCategory } from '@/lib/categories'
import {
  classifyHoldingKind,
  DEFAULT_LIABILITY_APR,
} from '@/lib/dashboardState'
import { findRecurringChain, groupByMerchant } from '@/lib/recurring'
import {
  computeIraCapacity,
  computeHsaCapacity,
  type FilingStatus,
  type HsaCoverage,
} from '@/lib/taxAdvantaged'
import type { SignalDomain } from '@/lib/types/vigilance'

const HYSA_RATE = 0.045
const CHECKING_RATE = 0.0001

export type RecoveryDomain =
  | 'match'
  | 'idle_cash'
  | 'debt'
  | 'subscription'
  | 'benefits'
  | 'hysa'
  | 'tax_advantaged'
  | 'category_overspend'
  | 'recurring_change'

export type RecoveryStatus = 'open' | 'recovered'

export interface RecoveryGap {
  id: string
  domain: RecoveryDomain
  label: string
  annualValue: number
  lifetimeValue?: number
  status: RecoveryStatus
  recoveredAt?: string
  actionPath?: string
  description: string
}

export interface RecoveryGapInput {
  accounts: Account[]
  transactions: Transaction[]
  holdings: (Holding & { account: { accountType: string } })[]
  benefits: EmploymentBenefits | null
  profile: OnboardingProfile | null
  existingEvents: { gapId: string; annualValue: number; recoveredAt: Date }[]
  /**
   * Transactions over a longer window (default 120 days) used only by the
   * subscription detector to verify a merchant "wasn't present in the prior
   * 90 days." Optional so existing callers (coach, /api/user/recovery) keep
   * working; when absent, `transactions` is used and new-subscription
   * detection is best-effort against that shorter window.
   */
  subscriptionTransactions?: Transaction[]
  /**
   * The user's current budget row. Optional; when absent, category-overspend
   * falls back to the historical 3-month average rule.
   */
  budget?: Budget | null
}

export interface RecoveryRateOptions {
  hysaRate: number
  checkingRate: number
}

const LIQUID_ACCOUNT_TYPES = new Set(['checking', 'savings', 'money market', 'cd'])
const SAVINGS_HINTS = ['savings', 'money market']
const HIGH_APR_THRESHOLD = 0.08
const HYSA_DETECTION_APR_THRESHOLD = 0.02
const RECOVERY_HORIZON_YEARS = 30

function round(n: number): number {
  return Math.round(n)
}

function lifetimeFromAnnual(annual: number, years: number = RECOVERY_HORIZON_YEARS): number {
  if (annual <= 0 || years <= 0) return 0
  return Math.round(annual * ((Math.pow(1.07, years) - 1) / 0.07))
}

function monthlyExpensesFrom(transactions: Transaction[], accounts: Account[]): number {
  if (transactions.length === 0) return 0
  const liabilityIds = new Set(
    accounts.filter(a => a.classification === 'liability').map(a => a.id),
  )
  let total = 0
  for (const tx of transactions) {
    if (liabilityIds.has(tx.accountId)) continue
    if (tx.amount < 0) total += Math.abs(tx.amount)
  }
  return total / 3
}

function totalLiquid(accounts: Account[]): number {
  return accounts
    .filter(a => a.classification === 'asset')
    .filter(a => LIQUID_ACCOUNT_TYPES.has(a.accountType.toLowerCase()))
    .reduce((s, a) => s + a.balance, 0)
}

function checkingBalance(accounts: Account[]): number {
  return accounts
    .filter(a => a.classification === 'asset')
    .filter(a => a.accountType.toLowerCase() === 'checking')
    .reduce((s, a) => s + a.balance, 0)
}

function isSavingsAccount(account: Account): boolean {
  const type = account.accountType.toLowerCase()
  if (!SAVINGS_HINTS.some(h => type.includes(h))) return false
  const apr = account.apr ?? null
  if (apr == null) return true
  return apr >= HYSA_DETECTION_APR_THRESHOLD
}

function highAprDebt(accounts: Account[]): { total: number; interestCost: number } {
  let total = 0
  let interestCost = 0
  for (const a of accounts) {
    if (a.classification !== 'liability') continue
    const apr = a.apr ?? DEFAULT_LIABILITY_APR
    if (apr <= HIGH_APR_THRESHOLD) continue
    const balance = Math.abs(a.balance)
    total += balance
    interestCost += balance * apr
  }
  return { total, interestCost }
}

function ytdRetirementContributions(transactions: Transaction[]): number {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  let total = 0
  for (const tx of transactions) {
    if (new Date(tx.date) < startOfYear) continue
    const cat = (tx.category ?? '').toLowerCase()
    if (cat.includes('retirement') || cat.includes('401') || cat.includes('ira')) {
      total += Math.abs(tx.amount)
    }
  }
  return total
}

function ytdContributionsByKind(
  transactions: Transaction[],
  accounts: Account[],
  holdings: RecoveryGapInput['holdings'],
): { ira: number; hsa: number; employer401k: number } {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  const accountKindById = new Map<string, string>()
  for (const a of accounts) {
    accountKindById.set(a.id, classifyHoldingKind(a.accountType))
  }

  let ira = 0
  let hsa = 0
  let employer401k = 0

  for (const tx of transactions) {
    if (new Date(tx.date) < startOfYear) continue
    if (tx.amount <= 0) continue
    const kind = accountKindById.get(tx.accountId)
    if (kind === 'ira' || kind === 'roth_ira') ira += tx.amount
    else if (kind === 'hsa') hsa += tx.amount
    else if (kind === '401k') employer401k += tx.amount
  }

  if (ira === 0) {
    const iraBalance = holdings
      .filter(h => {
        const kind = classifyHoldingKind(h.account.accountType)
        return kind === 'ira' || kind === 'roth_ira'
      })
      .reduce((s, h) => s + h.value, 0)
    if (iraBalance > 0) ira = iraBalance
  }
  if (hsa === 0) {
    const hsaBalance = holdings
      .filter(h => classifyHoldingKind(h.account.accountType) === 'hsa')
      .reduce((s, h) => s + h.value, 0)
    if (hsaBalance > 0) hsa = hsaBalance
  }
  if (employer401k === 0) {
    const k401 = holdings
      .filter(h => classifyHoldingKind(h.account.accountType) === '401k')
      .reduce((s, h) => s + h.value, 0)
    if (k401 > 0) employer401k = k401
  }

  return { ira, hsa, employer401k }
}

function extractFilingStatus(profile: OnboardingProfile | null): FilingStatus {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  const v = raw?.filingStatus
  if (v === 'mfj' || v === 'married_filing_jointly') return 'mfj'
  return 'single'
}

function extractHsaCoverage(profile: OnboardingProfile | null): HsaCoverage {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  return raw?.hsaCoverage === 'family' ? 'family' : 'self'
}

function extractContractFlags(profile: OnboardingProfile | null) {
  const raw = (profile?.contractParsedData ?? null) as Record<string, unknown> | null
  if (!raw) return null
  const readBool = (k: string): boolean | null | undefined => {
    const v = raw[k]
    if (typeof v === 'boolean') return v
    if (v === null) return null
    return undefined
  }
  return {
    hasHSA: readBool('hasHSA'),
    hasHDHP: readBool('hasHDHP'),
    allowsAfterTax401k: readBool('allowsAfterTax401k'),
    allowsInServiceRollover: readBool('allowsInServiceRollover'),
    hasRoth401k: readBool('hasRoth401k'),
  }
}

/**
 * Slugify a merchant name into a stable, URL-safe token for gapId composition.
 * Uses the same lowercasing convention as groupByMerchant so the id derived
 * here and the merchant key used in recurring detection stay in lockstep.
 */
function slugMerchantName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

/**
 * Detect subscription gaps from a pool of recent transactions.
 *
 * v1 implements rule (a) NEW ONLY. Rules (b) INCREASED and (c) DUPLICATE are
 * intentionally deferred:
 *   - INCREASED needs per-merchant amount snapshots across scans, which we do
 *     not capture today. A future pass should compare against a stored prior
 *     estimatedMonthlyAmount per (userId, merchant).
 *   - DUPLICATE needs fuzzy matching across merchant names and is scoped to a
 *     separate prompt.
 *
 * NEW rule (implementation detail, slightly relaxed from the spec because a
 * recurring chain requires >= 2 consecutive calendar months):
 *   - The merchant has a recurring chain (per findRecurringChain).
 *   - The chain's earliest charge is within the last 60 days.
 *   - The merchant has zero transactions in the 60 to 120 day window (no
 *     prior trace older than the chain's start).
 * The literal spec text ("within last 30 days, prior 90 days empty") is
 * physically impossible under the 2-consecutive-months recurring rule, so we
 * interpret "within last 30 days" as "the latest charge is within last 30
 * days" and shift the window accordingly.
 */
export function detectSubscriptionGaps(
  transactions: Transaction[],
  now: Date = new Date(),
): RecoveryGap[] {
  if (transactions.length === 0) return []

  const CHAIN_RECENT_WINDOW_DAYS = 60
  const LAST_CHARGE_RECENT_DAYS = 30
  const chainRecentCutoff = new Date(now.getTime())
  chainRecentCutoff.setDate(chainRecentCutoff.getDate() - CHAIN_RECENT_WINDOW_DAYS)
  const lastChargeCutoff = new Date(now.getTime())
  lastChargeCutoff.setDate(lastChargeCutoff.getDate() - LAST_CHARGE_RECENT_DAYS)

  // Only expense transactions (negative amounts) participate in subscription
  // detection. Income/refunds are ignored.
  const expenses = transactions.filter(t => t.amount < 0 && !!t.merchantName)

  const merchantMap = groupByMerchant(
    expenses.map(t => ({
      merchantName: t.merchantName,
      date: t.date,
      amount: t.amount,
    })),
  )

  const gaps: RecoveryGap[] = []
  const seenGapIds = new Set<string>()

  for (const [, txs] of merchantMap) {
    const chain = findRecurringChain(txs)
    if (!chain) continue

    const chainDates = chain.map(t => new Date(t.date))
    const earliestChainDate = chainDates.reduce(
      (min, d) => (d < min ? d : min),
      chainDates[0],
    )
    const latestChainDate = chainDates.reduce(
      (max, d) => (d > max ? d : max),
      chainDates[0],
    )
    if (earliestChainDate < chainRecentCutoff) continue
    if (latestChainDate < lastChargeCutoff) continue

    // No prior trace of this merchant older than the chain's start. If any
    // transaction predates the chain's first charge, this is not a NEW sub.
    const merchantEarliest = txs.reduce((min, t) => {
      const d = new Date(t.date)
      return d < min ? d : min
    }, new Date(txs[0].date))
    if (merchantEarliest < earliestChainDate) continue

    const monthlyAmount =
      chain.reduce((s, t) => s + Math.abs(t.amount ?? 0), 0) / chain.length
    const annualValue = Math.round(monthlyAmount * 12)
    if (annualValue <= 0) continue

    const displayName = (chain[chain.length - 1].merchantName ?? '').trim()
    if (!displayName) continue
    const slug = slugMerchantName(displayName)
    if (!slug) continue
    const id = `subscription:new:${slug}`
    if (seenGapIds.has(id)) continue
    seenGapIds.add(id)

    gaps.push({
      id,
      domain: 'subscription',
      label: `New subscription: ${displayName}`,
      annualValue,
      status: 'open',
      actionPath: '/dashboard/recurring',
      description: `New subscription detected: ${displayName} at about $${monthlyAmount.toFixed(
        0,
      )}/mo. Confirm this charge is intentional.`,
    })
  }

  return gaps
}

/**
 * Slugify a category name for gapId composition. Same rules as
 * slugMerchantName; kept separate for semantic clarity at call sites.
 */
function slugCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)
}

function monthKeyYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Detect category-overspend gaps for the user's current calendar month.
 *
 * Rules:
 *   (a) If the user has a budget row for the category, overspend is flagged
 *       when current-month spend exceeds the budget by more than
 *       max($50, 15% of budget).
 *   (b) If no budget row exists for the category, overspend is flagged when
 *       current-month spend exceeds the 3-month historical average
 *       (prior months only) by more than max($150, 40% of average).
 *
 * Categories whose current-month spend is below $25 are skipped to avoid
 * noise. GapId is scoped to YYYY-MM so a month's overspend resolves on its
 * own once the calendar rolls over and a fresh gapId takes its place.
 */
export function detectCategoryOverspendGaps(
  transactions: Transaction[],
  budget: Budget | null,
  now: Date = new Date(),
): RecoveryGap[] {
  if (transactions.length === 0) return []

  const MIN_SPEND_FLOOR = 25
  const BUDGET_ABS_FLOOR = 50
  const BUDGET_PCT_FLOOR = 0.15
  const AVG_ABS_FLOOR = 150
  const AVG_PCT_FLOOR = 0.4

  const currentMonthKey = monthKeyYM(now)

  // Bucket spend by (month, category). Spending is magnitude of negative
  // amounts; Savings / Debt Payment treatment here intentionally matches the
  // budget actuals endpoint so "overspend" aligns with what the user sees.
  const monthCategoryTotals = new Map<string, Map<string, number>>()
  for (const tx of transactions) {
    const d = new Date(tx.date)
    if (Number.isNaN(d.getTime())) continue
    const mk = monthKeyYM(d)
    const cat = normalizeCategory(tx.category)
    let value: number
    if (cat === 'Savings' || cat === 'Debt Payment') {
      value = Math.abs(tx.amount)
    } else if (tx.amount < 0) {
      value = Math.abs(tx.amount)
    } else {
      continue
    }
    if (!monthCategoryTotals.has(mk)) monthCategoryTotals.set(mk, new Map())
    const cats = monthCategoryTotals.get(mk)!
    cats.set(cat, (cats.get(cat) ?? 0) + value)
  }

  const currentMonth = monthCategoryTotals.get(currentMonthKey) ?? new Map()

  // Build prior-month averages (exclude current month from the denominator).
  const priorMonthKeys = [...monthCategoryTotals.keys()].filter(
    k => k !== currentMonthKey,
  )
  const priorMonthCount = priorMonthKeys.length
  const priorTotals = new Map<string, number>()
  for (const mk of priorMonthKeys) {
    const cats = monthCategoryTotals.get(mk)!
    for (const [cat, total] of cats) {
      priorTotals.set(cat, (priorTotals.get(cat) ?? 0) + total)
    }
  }

  const budgetByCategory = new Map<string, number>()
  const rawCats = (budget?.categories ?? null) as
    | Array<{ name?: unknown; amount?: unknown }>
    | null
  if (Array.isArray(rawCats)) {
    for (const row of rawCats) {
      if (!row || typeof row !== 'object') continue
      const name = typeof row.name === 'string' ? row.name : null
      const amount = typeof row.amount === 'number' ? row.amount : null
      if (!name || amount == null || amount <= 0) continue
      const canon = normalizeCategory(name)
      budgetByCategory.set(canon, amount)
    }
  }

  const gaps: RecoveryGap[] = []
  for (const [category, spend] of currentMonth) {
    if (spend < MIN_SPEND_FLOOR) continue

    const budgetAmt = budgetByCategory.get(category) ?? null
    let basis: 'budget' | 'average'
    let compareTo: number
    let overspend: number
    let threshold: number

    if (budgetAmt != null) {
      basis = 'budget'
      compareTo = budgetAmt
      overspend = spend - budgetAmt
      threshold = Math.max(BUDGET_ABS_FLOOR, budgetAmt * BUDGET_PCT_FLOOR)
    } else {
      if (priorMonthCount === 0) continue
      const avg = (priorTotals.get(category) ?? 0) / priorMonthCount
      if (avg <= 0) continue
      basis = 'average'
      compareTo = avg
      overspend = spend - avg
      threshold = Math.max(AVG_ABS_FLOOR, avg * AVG_PCT_FLOOR)
    }

    if (overspend <= threshold) continue

    const annualValue = Math.round(overspend * 12)
    if (annualValue <= 0) continue

    const slug = slugCategoryName(category)
    if (!slug) continue
    const id = `category_overspend:${slug}:${currentMonthKey}`
    const basisLabel = basis === 'budget' ? 'budget' : 'average'
    gaps.push({
      id,
      domain: 'category_overspend',
      label: `Overspend on ${category}: $${Math.round(overspend)} above ${basisLabel}`,
      annualValue,
      status: 'open',
      actionPath: '/dashboard/budget',
      description: `This month's ${category} spending is about $${Math.round(
        spend,
      )} vs the ${basisLabel} of $${Math.round(
        compareTo,
      )}. Review recent charges to keep the month on track.`,
    })
  }

  return gaps
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Detect recurring-change gaps across a user's expense history.
 *
 * Rules (both emitted):
 *   (a) INCREASED: the most recent charge in a recurring chain is higher
 *       than the median of the prior 3 charges by more than
 *       max($5, 15% of that median). The gap value projects the increment
 *       forward 12 months.
 *   (b) DISAPPEARED: a merchant that previously had a recurring chain (>= 2
 *       consecutive months) has no charge in the last 45 days. Detected
 *       purely from transaction history; we do not consult the Signal table
 *       for memory because the 120-day transaction window gives us the same
 *       signal cheaply and avoids coupling this detector to a separate
 *       persistence layer. The gap value carries the prior monthly spend so
 *       the user can see what they were paying.
 *
 * Merchants whose chain is too short for a meaningful median (fewer than 2
 * charges prior to the most recent) are skipped for the INCREASED rule.
 */
export function detectRecurringChangeGaps(
  transactions: Transaction[],
  now: Date = new Date(),
): RecoveryGap[] {
  if (transactions.length === 0) return []

  const INCREASE_ABS_FLOOR = 5
  const INCREASE_PCT_FLOOR = 0.15
  const DISAPPEARED_SILENCE_DAYS = 45
  const silenceCutoff = new Date(now.getTime())
  silenceCutoff.setDate(silenceCutoff.getDate() - DISAPPEARED_SILENCE_DAYS)

  const expenses = transactions.filter(t => t.amount < 0 && !!t.merchantName)
  const merchantMap = groupByMerchant(
    expenses.map(t => ({
      merchantName: t.merchantName,
      date: t.date,
      amount: t.amount,
    })),
  )

  const gaps: RecoveryGap[] = []
  const seenIds = new Set<string>()

  for (const [, txs] of merchantMap) {
    const chain = findRecurringChain(txs)
    if (!chain) continue

    const displayName = (chain[chain.length - 1].merchantName ?? '').trim()
    if (!displayName) continue
    const slug = slugMerchantName(displayName)
    if (!slug) continue

    // Chain is sorted ascending by findRecurringChain. Last element is the
    // most recent charge.
    const lastCharge = chain[chain.length - 1]
    const lastAmountAbs = Math.abs(lastCharge.amount ?? 0)
    const lastDate = new Date(lastCharge.date)

    // --- (a) INCREASED ---
    if (chain.length >= 3) {
      const priorCharges = chain.slice(0, -1).slice(-3)
      const priorAmounts = priorCharges.map(t => Math.abs(t.amount ?? 0))
      const priorMedian = median(priorAmounts)
      if (priorMedian > 0) {
        const delta = lastAmountAbs - priorMedian
        const threshold = Math.max(
          INCREASE_ABS_FLOOR,
          priorMedian * INCREASE_PCT_FLOOR,
        )
        if (delta > threshold) {
          const id = `recurring_change:increased:${slug}`
          if (!seenIds.has(id)) {
            seenIds.add(id)
            const annualValue = Math.round(delta * 12)
            if (annualValue > 0) {
              gaps.push({
                id,
                domain: 'recurring_change',
                label: `Recurring charge increased: ${displayName} $${Math.round(
                  priorMedian,
                )} to $${Math.round(lastAmountAbs)}`,
                annualValue,
                status: 'open',
                actionPath: '/dashboard/recurring',
                description: `${displayName} just charged about $${Math.round(
                  lastAmountAbs,
                )}, up from a typical $${Math.round(
                  priorMedian,
                )}. Confirm this increase is expected.`,
              })
            }
          }
        }
      }
    }

    // --- (b) DISAPPEARED ---
    // The chain establishes that this merchant was recurring; if its latest
    // charge is older than the silence cutoff, the cadence has lapsed.
    if (lastDate < silenceCutoff) {
      const monthlyAmount =
        chain.reduce((s, t) => s + Math.abs(t.amount ?? 0), 0) / chain.length
      const annualValue = Math.round(monthlyAmount * 12)
      if (annualValue > 0) {
        const id = `recurring_change:disappeared:${slug}`
        if (!seenIds.has(id)) {
          seenIds.add(id)
          gaps.push({
            id,
            domain: 'recurring_change',
            label: `Recurring charge stopped: ${displayName}`,
            annualValue,
            status: 'open',
            actionPath: '/dashboard/recurring',
            description: `${displayName} has not charged in over ${DISAPPEARED_SILENCE_DAYS} days. This may be an intentional cancellation or a billing failure worth reviewing.`,
          })
        }
      }
    }
  }

  return gaps
}

export function evaluateGaps(
  input: RecoveryGapInput,
  opts: RecoveryRateOptions,
): RecoveryGap[] {
  const { accounts, transactions, holdings, benefits, profile, existingEvents } = input
  const eventByGapId = new Map(existingEvents.map(e => [e.gapId, e]))
  const gaps: RecoveryGap[] = []

  const annualIncome = profile?.annualIncome ?? null
  const monthlyExpenses = monthlyExpensesFrom(transactions, accounts)
  const buffer = monthlyExpenses * 3

  // ── 401k match gap ─────────────────────────────────────────────────────
  if (
    benefits?.has401k &&
    benefits.matchRate != null &&
    benefits.matchCap != null &&
    annualIncome &&
    annualIncome > 0
  ) {
    const matchAnnual = round(annualIncome * benefits.matchCap * benefits.matchRate)
    const id = 'match:401k'
    const existing = eventByGapId.get(id)
    const actionItems = (benefits.actionItemsDone ?? []) as string[]
    const markedDone =
      actionItems.includes('401(k) Enrollment') ||
      actionItems.includes('401(k) Match')
    const ytdRetirement = ytdRetirementContributions(transactions)
    const reachedThreshold =
      annualIncome > 0 && ytdRetirement >= annualIncome * benefits.matchCap * 0.5
    const isRecovered = !!existing || markedDone || reachedThreshold
    gaps.push({
      id,
      domain: 'match',
      label: '401(k) employer match',
      annualValue: matchAnnual,
      lifetimeValue: lifetimeFromAnnual(matchAnnual),
      status: isRecovered ? 'recovered' : 'open',
      recoveredAt: existing?.recoveredAt.toISOString(),
      actionPath: '/dashboard/benefits',
      description: `Contribute at least ${(benefits.matchCap * 100).toFixed(0)}% of salary to capture the full employer match.`,
    })
  }

  // ── Idle cash gap ──────────────────────────────────────────────────────
  const liquid = totalLiquid(accounts)
  const idleCash = Math.max(0, liquid - buffer)
  {
    const id = 'idle_cash:default'
    const existing = eventByGapId.get(id)
    const annualValue = round(idleCash * 0.07)
    const isRecovered = !!existing || idleCash <= 0
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'idle_cash',
        label: 'Idle cash drag',
        annualValue: existing?.annualValue ?? annualValue,
        lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? annualValue, 10),
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/opportunity',
        description: 'Move cash above your 3-month buffer into invested assets.',
      })
    }
  }

  // ── HYSA yield uplift ──────────────────────────────────────────────────
  {
    const id = 'hysa:default'
    const existing = eventByGapId.get(id)
    const checking = checkingBalance(accounts)
    const idleChecking = Math.max(0, checking - buffer)
    const annualValue = round(idleChecking * (opts.hysaRate - opts.checkingRate))
    const hasHysa = accounts.some(a => a.classification === 'asset' && isSavingsAccount(a))
    const isRecovered = !!existing || hasHysa
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'hysa',
        label: 'High-yield savings uplift',
        annualValue: existing?.annualValue ?? annualValue,
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/accounts',
        description: 'Move idle checking dollars into a high-yield savings account.',
      })
    }
  }

  // ── High-APR debt interest cost ────────────────────────────────────────
  {
    const id = 'debt:high_apr'
    const existing = eventByGapId.get(id)
    const { total: highAprTotal, interestCost } = highAprDebt(accounts)
    const annualValue = round(interestCost)
    const isRecovered = !!existing || highAprTotal <= 0
    if (annualValue > 0 || existing) {
      gaps.push({
        id,
        domain: 'debt',
        label: 'High-APR debt interest',
        annualValue: existing?.annualValue ?? annualValue,
        lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? annualValue, 5),
        status: isRecovered ? 'recovered' : 'open',
        recoveredAt: existing?.recoveredAt.toISOString(),
        actionPath: '/dashboard/forecast/debt-paydown',
        description: 'Pay down balances on debts above 8% APR to stop interest bleed.',
      })
    }
  }

  // ── Benefits gaps (per item) ───────────────────────────────────────────
  if (benefits) {
    const extracted = (benefits.rawExtraction ?? null) as ExtractedBenefits | null
    if (extracted) {
      const actionItems = (benefits.actionItemsDone ?? []) as string[]
      const items = crossCheckBenefits(extracted)
      for (const item of items) {
        if (!item.annualValue || item.annualValue <= 0) continue
        const id = `benefits:${item.label}`
        const existing = eventByGapId.get(id)
        const markedDone = actionItems.includes(item.label)
        const isRecovered = !!existing || markedDone || item.captured === true
        gaps.push({
          id,
          domain: 'benefits',
          label: item.label,
          annualValue: existing?.annualValue ?? round(item.annualValue),
          lifetimeValue: lifetimeFromAnnual(existing?.annualValue ?? item.annualValue, 5),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/benefits',
          description: item.action,
        })
      }
    }
  }

  // ── Tax-advantaged capacity (IRA + HSA, year-scoped) ───────────────────
  if (profile) {
    const year = new Date().getFullYear()
    const contract = extractContractFlags(profile)
    const ytd = ytdContributionsByKind(transactions, accounts, holdings)

    const iraCapacity = computeIraCapacity({
      age: profile.age,
      annualIncome: profile.annualIncome,
      filingStatus: extractFilingStatus(profile),
      hsaCoverage: extractHsaCoverage(profile),
      traditionalIraBalance: 0,
      iraContributedYtd: ytd.ira,
      hsaContributedYtd: ytd.hsa,
      employee401kContributedYtd: ytd.employer401k,
      employer401kContributedYtd: 0,
      current401kRothShare: null,
    })
    {
      const id = `tax_advantaged:ira:${year}`
      const existing = eventByGapId.get(id)
      const isRecovered = !!existing || iraCapacity.remaining <= 0
      const annualValue = isRecovered ? iraCapacity.limit : iraCapacity.remaining
      if (annualValue > 0 || existing) {
        gaps.push({
          id,
          domain: 'tax_advantaged',
          label: `IRA capacity (${year})`,
          annualValue: existing?.annualValue ?? round(annualValue),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/forecast',
          description: 'Use this year\'s IRA contribution room before April 15 cutoff.',
        })
      }
    }

    const hsaCapacity = computeHsaCapacity(
      {
        age: profile.age,
        annualIncome: profile.annualIncome,
        filingStatus: extractFilingStatus(profile),
        hsaCoverage: extractHsaCoverage(profile),
        traditionalIraBalance: 0,
        iraContributedYtd: ytd.ira,
        hsaContributedYtd: ytd.hsa,
        employee401kContributedYtd: ytd.employer401k,
        employer401kContributedYtd: 0,
        current401kRothShare: null,
      },
      contract,
    )
    if (hsaCapacity.eligible === 'eligible' && hsaCapacity.remaining != null) {
      const id = `tax_advantaged:hsa:${year}`
      const existing = eventByGapId.get(id)
      const isRecovered = !!existing || hsaCapacity.remaining <= 0
      const annualValue = isRecovered ? hsaCapacity.limit : hsaCapacity.remaining
      if (annualValue > 0 || existing) {
        gaps.push({
          id,
          domain: 'tax_advantaged',
          label: `HSA capacity (${year})`,
          annualValue: existing?.annualValue ?? round(annualValue),
          status: isRecovered ? 'recovered' : 'open',
          recoveredAt: existing?.recoveredAt.toISOString(),
          actionPath: '/dashboard/benefits',
          description: 'Use this year\'s HSA contribution room before the April 15 cutoff.',
        })
      }
    }
  }

  // ── Subscription gaps (v1: NEW only) ───────────────────────────────────
  // Detection is wrapped in a guard so a faulty merchant stream (e.g. bad
  // date parsing) cannot take down the whole scan for this user.
  try {
    const subTx = input.subscriptionTransactions ?? transactions
    const subscriptionGaps = detectSubscriptionGaps(subTx)
    for (const g of subscriptionGaps) {
      // NEW subscription gaps never "recover" via RecoveryEvent; they
      // auto-resolve once the merchant no longer qualifies as new in a
      // later scan (earliest charge falls out of the 60-day window).
      gaps.push(g)
    }
  } catch (err) {
    console.error('[recovery] detectSubscriptionGaps failed; skipping', err)
  }

  // ── Category-overspend gaps ───────────────────────────────────────────
  // Independent try/catch so an issue in this detector does not affect the
  // recurring-change detector below or any earlier domain.
  try {
    const overspendGaps = detectCategoryOverspendGaps(
      transactions,
      input.budget ?? null,
    )
    for (const g of overspendGaps) gaps.push(g)
  } catch (err) {
    console.error('[recovery] detectCategoryOverspendGaps failed; skipping', err)
  }

  // ── Recurring-change gaps (increased / disappeared) ───────────────────
  // Uses the longer subscription transaction window when available so
  // disappeared chains remain detectable for up to 120 days.
  try {
    const changeTx = input.subscriptionTransactions ?? transactions
    const recurringChangeGaps = detectRecurringChangeGaps(changeTx)
    for (const g of recurringChangeGaps) gaps.push(g)
  } catch (err) {
    console.error('[recovery] detectRecurringChangeGaps failed; skipping', err)
  }

  return gaps
}

export interface RecoverySummary {
  recovered: number
  open: number
  gaps: RecoveryGap[]
  lastUpdated: string
}

export function summarize(gaps: RecoveryGap[]): RecoverySummary {
  const recovered = gaps
    .filter(g => g.status === 'recovered')
    .reduce((s, g) => s + g.annualValue, 0)
  const open = gaps
    .filter(g => g.status === 'open')
    .reduce((s, g) => s + g.annualValue, 0)
  return {
    recovered: Math.round(recovered),
    open: Math.round(open),
    gaps,
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Wire format consumed by the vigilance scan runner. One entry per currently
 * flagged gap (i.e. gaps that would surface as "open" in evaluateGaps). The
 * payload carries signal-specific details the UI can render without having
 * to re-derive them.
 */
export interface DetectedGap {
  gapId: string
  domain: SignalDomain
  annualValue: number
  lifetimeValue: number | null
  payload: Record<string, unknown>
}

/**
 * Map a RecoveryDomain to its wire-format SignalDomain. Exhaustive over the
 * RecoveryDomain union; TypeScript enforces that new domains land a case.
 */
function toSignalDomain(domain: RecoveryDomain): SignalDomain | null {
  switch (domain) {
    case 'match':
    case 'idle_cash':
    case 'debt':
    case 'benefits':
    case 'hysa':
    case 'tax_advantaged':
    case 'subscription':
    case 'category_overspend':
    case 'recurring_change':
      return domain
  }
}

/**
 * Load raw data for the current user, evaluate recovery gaps, and return
 * only those that are currently flagged (status === 'open'). Recovered gaps
 * are intentionally excluded — the scan runner uses the absence of a gapId
 * from this list to drive resolution of stale signals.
 */
export async function detectGaps(
  userId: string,
  prismaClient: PrismaClient,
): Promise<DetectedGap[]> {
  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - 3)
  // Subscription NEW detection needs 120 days so "prior 90 days empty" can
  // be verified against a merchant's last 60 days of activity.
  const subscriptionSince = new Date()
  subscriptionSince.setDate(subscriptionSince.getDate() - 120)

  const [
    accounts,
    transactions,
    subscriptionTransactions,
    holdings,
    benefits,
    profile,
    existingEvents,
    budget,
  ] = await Promise.all([
    prismaClient.account.findMany({ where: { userId } }),
    prismaClient.transaction.findMany({
      where: { account: { userId }, date: { gte: sinceDate } },
    }),
    prismaClient.transaction.findMany({
      where: { account: { userId }, date: { gte: subscriptionSince } },
    }),
    prismaClient.holding.findMany({
      where: { account: { userId } },
      include: { account: { select: { accountType: true } } },
    }),
    prismaClient.employmentBenefits.findUnique({ where: { userId } }),
    prismaClient.onboardingProfile.findUnique({ where: { userId } }),
    prismaClient.recoveryEvent.findMany({ where: { userId } }),
    prismaClient.budget.findUnique({ where: { userId } }),
  ])

  const gaps = evaluateGaps(
    {
      accounts,
      transactions,
      subscriptionTransactions,
      holdings,
      benefits,
      profile,
      existingEvents: existingEvents.map(e => ({
        gapId: e.gapId,
        annualValue: e.annualValue,
        recoveredAt: e.recoveredAt,
      })),
      budget,
    },
    { hysaRate: HYSA_RATE, checkingRate: CHECKING_RATE },
  )

  const detected: DetectedGap[] = []
  for (const gap of gaps) {
    if (gap.status !== 'open') continue
    const domain = toSignalDomain(gap.domain)
    if (!domain) continue
    detected.push({
      gapId: gap.id,
      domain,
      annualValue: gap.annualValue,
      lifetimeValue: gap.lifetimeValue ?? null,
      payload: {
        label: gap.label,
        description: gap.description,
        actionPath: gap.actionPath ?? null,
      },
    })
  }
  return detected
}

export async function persistNewRecoveries(
  prisma: PrismaClient,
  userId: string,
  gaps: RecoveryGap[],
  existingGapIds: Set<string>,
): Promise<RecoveryGap[]> {
  const toWrite = gaps.filter(g => g.status === 'recovered' && !existingGapIds.has(g.id))
  if (toWrite.length === 0) return []
  const now = new Date()
  await prisma.recoveryEvent.createMany({
    data: toWrite.map(g => ({
      userId,
      gapId: g.id,
      domain: g.domain,
      annualValue: g.annualValue,
      recoveredAt: now,
    })),
    skipDuplicates: true,
  })
  return toWrite.map(g => ({ ...g, recoveredAt: now.toISOString() }))
}
