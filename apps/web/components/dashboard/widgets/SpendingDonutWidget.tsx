'use client'

import DonutChart from '@/components/ui/DonutChart'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

export default function SpendingDonutWidget() {
  const { spendingByCategory } = useDashboard()
  return (
    <WidgetCard label="Spending by category" title="Last 30 days">
      <DonutChart data={spendingByCategory} />
    </WidgetCard>
  )
}
