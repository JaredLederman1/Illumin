'use client'

import type { ReactNode } from 'react'
import type { PriorityMetrics } from '@/lib/dashboardState'
import type { WidgetId } from './widgetIds'

import NetWorthWidget from './widgets/NetWorthWidget'
import SpendingDonutWidget from './widgets/SpendingDonutWidget'
import CashFlowWidget from './widgets/CashFlowWidget'
import RecurringChargesWidget from './widgets/RecurringChargesWidget'
import OpportunityCostWidget from './widgets/OpportunityCostWidget'
import PortfolioWidget from './widgets/PortfolioWidget'
import RecentTransactionsWidget from './widgets/RecentTransactionsWidget'
import GoalsProgressWidget from './widgets/GoalsProgressWidget'
import HealthScoreWidget from './widgets/HealthScoreWidget'
import AccountBalancesWidget from './widgets/AccountBalancesWidget'

import DebtTrajectoryCard from './placeholders/DebtTrajectoryCard'
import EmergencyFundGaugeCard from './placeholders/EmergencyFundGaugeCard'
import MatchSetupCard from './placeholders/MatchSetupCard'
import MatchGapCard from './placeholders/MatchGapCard'
import TaxAdvantagedCapacityCard from './placeholders/TaxAdvantagedCapacityCard'
import CategoryConcentrationCard from './placeholders/CategoryConcentrationCard'
import WealthTrajectoryCard from './placeholders/WealthTrajectoryCard'
import AdvancedStrategiesCard from './placeholders/AdvancedStrategiesCard'
import LinkAssetAccountCard from './placeholders/LinkAssetAccountCard'

export function renderWidget(id: WidgetId, metrics: PriorityMetrics): ReactNode {
  switch (id) {
    case 'net-worth-chart':
      return <NetWorthWidget />
    case 'spending-donut':
      return <SpendingDonutWidget />
    case 'cash-flow':
      return <CashFlowWidget />
    case 'recurring-charges':
      return <RecurringChargesWidget />
    case 'opportunity-cost':
      return <OpportunityCostWidget />
    case 'portfolio':
      return <PortfolioWidget />
    case 'recent-transactions':
      return <RecentTransactionsWidget />
    case 'goals-progress':
      return <GoalsProgressWidget />
    case 'health-score':
      return <HealthScoreWidget />
    case 'account-balances':
      return <AccountBalancesWidget />
    case 'debt-trajectory':
      return (
        <DebtTrajectoryCard
          annualInterestCost={metrics.annualInterestCost}
          highAprDebtTotal={metrics.highAprDebtTotal}
          scenarios={metrics.debtPayoffScenarios}
        />
      )
    case 'emergency-fund-gauge':
      return (
        <EmergencyFundGaugeCard
          months={metrics.emergencyFundMonths}
          target={metrics.emergencyFundTargetMonths}
        />
      )
    case 'match-setup':
      return <MatchSetupCard />
    case 'match-gap':
      return (
        <MatchGapCard
          matchGapAnnual={metrics.matchGapAnnual}
          totalMatchAnnual={metrics.totalMatchAnnual}
          matchCapturedAnnual={metrics.matchCapturedAnnual}
          matchDetail={metrics.matchDetail}
        />
      )
    case 'tax-advantaged-capacity':
      return <TaxAdvantagedCapacityCard breakdown={metrics.taxAdvantagedBreakdown} />

    case 'category-concentration':
      return (
        <CategoryConcentrationCard
          concentrationPct={metrics.discretionaryConcentrationPct}
          topCategories={metrics.topDiscretionaryCategories}
        />
      )
    case 'wealth-trajectory':
      return (
        <WealthTrajectoryCard
          projectedRetirementNetWorth={metrics.projectedRetirementNetWorth}
          netWorth={metrics.netWorth}
        />
      )
    case 'advanced-strategies':
      return <AdvancedStrategiesCard />
    case 'link-asset-account':
      return <LinkAssetAccountCard />
    default:
      return null
  }
}
