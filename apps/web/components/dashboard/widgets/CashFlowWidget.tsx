'use client'

import BarChart from '@/components/ui/BarChart'
import { useDashboard } from '@/lib/dashboardData'
import WidgetCard from './WidgetCard'

export default function CashFlowWidget() {
  const { monthlyData } = useDashboard()
  return (
    <WidgetCard label="Cash flow" title="Income vs expenses, last 6 months">
      <BarChart data={monthlyData} />
    </WidgetCard>
  )
}
