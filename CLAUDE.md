# Illumin — CLAUDE.md

Personal wealth management platform offering institutional-grade financial tools to everyone, not just high-net-worth individuals.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.1.6, App Router, TypeScript |
| React | 19.2.3 |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7.5.0 + `@prisma/adapter-pg` (required adapter) |
| Auth | Supabase (`@supabase/supabase-js` 2.x, `@supabase/ssr`) |
| Styling | Tailwind CSS v4 (CSS-only config, no `tailwind.config.js`) |
| Animation | framer-motion 12.x |
| Charts | recharts 3.x |
| AI | `@anthropic-ai/sdk` 0.78.0 + `@anthropic-ai/claude-agent-sdk` 0.2.x |
| Email | Resend 6.x |
| Open banking | Plaid API (sandbox), `plaid` + `react-plaid-link` |
| PDF parsing | pdf-parse 2.x (server-only, listed in `serverExternalPackages`) |

**Fonts:**
- `DM Serif Display` — `var(--font-serif)` — headings, financial numbers
- `DM Mono` — `var(--font-mono)` — body, UI labels
- `Cormorant Garamond` — `var(--font-heading)` — display only

---

## Directory Structure

```
/
├── app/
│   ├── page.tsx                    # Landing page (server, metadata only)
│   ├── LandingClient.tsx           # Landing page client component (all copy lives here)
│   ├── landing.module.css          # Landing page styles (CSS Modules)
│   ├── layout.tsx                  # Root layout (fonts, metadata)
│   ├── globals.css                 # Tailwind v4 @theme{} config + global styles
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   └── page.tsx
│   ├── onboarding/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx              # Sidebar + Header + PageTransition
│   │   ├── page.tsx                # Overview
│   │   ├── accounts/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── cashflow/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── score/page.tsx
│   │   ├── profile/page.tsx
│   │   └── benefits/page.tsx
│   └── api/
│       ├── accounts/route.ts       # GET accounts
│       ├── accounts/[id]/route.ts  # DELETE account + its transactions
│       ├── transactions/route.ts   # GET transactions (filtered, paginated)
│       ├── networth/route.ts       # GET net worth
│       ├── waitlist/route.ts       # POST email to Resend
│       ├── agent/route.ts          # POST Claude agent (streaming)
│       ├── plaid/
│       │   ├── create-link-token/route.ts  # GET — creates Plaid Link token
│       │   ├── exchange-token/route.ts     # POST — exchanges public token, saves accounts/transactions
│       │   ├── sync/route.ts               # POST — refreshes balances and transactions
│       │   └── reset/route.ts              # POST — dev-only, clears all accounts/transactions
│       └── user/
│           ├── onboarding/route.ts # POST — STUBBED (logs only, no DB save)
│           ├── score/route.ts      # GET — financial health score
│           ├── benefits/route.ts   # GET — fetch stored benefits
│           ├── benefits/extract/route.ts  # POST — PDF → Claude → ExtractedBenefits
│           └── benefits/actions/route.ts  # PATCH — mark action items done
├── components/
│   ├── ui/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── AccountCard.tsx         # Supports id + onRemove (DELETE /api/accounts/[id])
│   │   ├── TransactionRow.tsx      # Uses framer-motion Variants type (not plain string)
│   │   ├── NetWorthCard.tsx
│   │   ├── DonutChart.tsx
│   │   ├── BarChart.tsx
│   │   └── ForecastChart.tsx
│   ├── OppCostCalculator.tsx
│   └── PageTransition.tsx
├── lib/
│   ├── supabase.ts                 # Lazy-init Proxy client (must stay this way)
│   ├── prisma.ts                   # PrismaClient singleton with PrismaPg adapter
│   ├── plaid.ts                    # Plaid API helpers (createLinkToken, exchangePublicToken, etc.)
│   ├── benefitsAnalysis.ts         # ExtractedBenefits type, crossCheckBenefits, calcTotals
│   ├── mockData.ts                 # Full mock dataset (accounts, transactions, etc.)
│   └── data.ts                     # USE_MOCK_DATA flag (currently false)
├── prisma/
│   ├── schema.prisma               # DB models — NO url field here
│   └── config.ts (prisma.config.ts) # Datasource URL lives here (Prisma 7 requirement)
├── middleware.ts                    # Supabase session guard for all non-public routes
├── prisma.config.ts
├── next.config.ts
└── tsconfig.json
```

---

## Auth Architecture

**Middleware (`middleware.ts`)** runs on every request. Public paths that bypass auth:
- `/`
- `/auth/login`, `/auth/signup`
- `/admin/login`
- `/api/waitlist`

All other routes: Supabase server client reads the session cookie. No session → redirect to `/auth/login`.

**API routes** validate independently via `Authorization: Bearer <JWT>` header:
```ts
const { data: { user } } = await supabase.auth.getUser(token)
```

**Client** uses the lazy Proxy in `lib/supabase.ts`. Never instantiate Supabase directly in pages — always import from `@/lib/supabase`.

---

## Database Schema

```
User               id, email, createdAt
Account            id, userId, institutionName, accountType, balance, last4,
                   plaidAccountId, plaidAccessToken, plaidItemId, createdAt
Transaction        id, accountId, merchantName, amount, category, date, pending
NetWorthSnapshot   id, userId, totalAssets, totalLiabilities, recordedAt
OnboardingProfile  id, userId, age, annualIncome, savingsRate, retirementAge,
                   createdAt, updatedAt
EmploymentBenefits id, userId, extractedAt, rawExtraction (Json), has401k,
                   matchRate, matchCap, vestingYears, hasHSA, hsaEmployerContrib,
                   hasFSA, fsaLimit, hasRSUs, hasESPP, esppDiscount,
                   hasCommuterBenefits, commuterMonthlyLimit, tuitionReimbursement,
                   wellnessStipend, totalAnnualValue, capturedAnnualValue,
                   actionItemsDone (Json)
```

After schema changes: `npx prisma generate` then `npx prisma db push` (or `npx prisma migrate dev`).

---

## Feature Status

| Feature | Status | Notes |
|---|---|---|
| Landing page | Complete | Copy in `LandingClient.tsx`, styles in `landing.module.css` |
| Auth (login/signup) | Complete | Supabase |
| Dashboard overview | Complete | Mock data fallback if API fails |
| Accounts page | Complete | Plaid Link modal, remove account flow |
| Transactions page | Complete | Filter by account + category |
| Cash flow | Complete | Monthly bar chart |
| Forecast / projections | Complete | |
| Financial health score | Complete | `/api/user/score` |
| Benefits analyzer | Complete | PDF upload → Claude extraction → cross-check |
| Onboarding flow | UI complete, API stubbed | `POST /api/user/onboarding` logs only, no DB save |
| Admin dashboard | Partial | Basic Supabase integration, not fully built |
| Profile page | Exists | Extent of implementation unclear |
| Real account data | Complete | Via Plaid Link + sync |
| Mock data fallback | Complete | `lib/data.ts` `USE_MOCK_DATA` flag |

---

## Known Issues / TODOs

- **`POST /api/user/onboarding`** does not persist to the database. It only logs the payload. The `OnboardingProfile` model exists in the schema but the route needs a DB save implemented.
- **`EmploymentBenefits` DB schema** is missing newer fields added to `ExtractedBenefits` in `lib/benefitsAnalysis.ts` (e.g., `rsuGrantValue`, `stockOptionShares`, `paidSickLeaveDays`). These are stored in `rawExtraction` JSON but not as individual columns. A migration is needed to add them as columns if individual querying is required.

---

## Hard Constraints

### Prisma 7
- `prisma/schema.prisma` datasource block must **not** have a `url` field — this causes a validation error in Prisma 7.
- The connection URL lives exclusively in `prisma.config.ts`.
- `PrismaClient` must be instantiated with `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
- `DATABASE_URL` must be a standard `postgresql://` URL, not `prisma+postgres://`.

### Tailwind CSS v4
- There is no `tailwind.config.js`. Do not create one.
- All theme customization is CSS-only via the `@theme {}` block in `app/globals.css`.

### Supabase client
- Must remain lazily initialized via the Proxy pattern in `lib/supabase.ts`.
- This prevents build-time failures when env vars are absent.

### framer-motion
- `TransactionRow` uses the `Variants` type from framer-motion for `rowVariants`. Do not change easing to a plain string — it causes a TypeScript error.

### Brand name
- Always **Illumin**. Never "Sovereign", "Lumen", or any other name.

### Copy style
- No em dashes (`—`) anywhere in copy, titles, or code comments. Use commas, periods, or colons instead.

---

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=                    # postgresql://... (standard URL)
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
ANTHROPIC_API_KEY=               # For benefits PDF extraction
RESEND_API_KEY=                  # For waitlist
RESEND_AUDIENCE_ID=              # Resend contact list ID
```

---

## Design System

```
Background:    #F5F0E8   Surface: #FFFFFF   Surface-2: #FDFBF8
Gold:          #B8913A   Gold-dark: #9A7A2A
Text:          #1A1714   Text-mid: #6B5D4A   Text-muted: #A89880
Positive:      #2D6A4F   Positive-bg: rgba(45,106,79,0.08)
Negative:      #8B2635   Negative-bg: rgba(139,38,53,0.08)
Border:        rgba(184,145,58,0.18)   Border-strong: rgba(184,145,58,0.35)
```

Motion: 150ms ease hovers, 300-400ms enter (opacity + translateY), 30ms row stagger.

---

## Plaid Sandbox

- Environment: `sandbox` (configured via `PLAID_ENV=sandbox`)
- Test credentials: username `user_good`, password `pass_good`
- Sandbox institutions available in Plaid Link automatically
- `lib/plaid.ts` exports: `plaidClient`, `createLinkToken`, `exchangePublicToken`, `getAccounts`, `getTransactions`, `syncAccountBalances`
