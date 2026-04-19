'use client'

import { motion } from 'framer-motion'
import type { DashboardState, PriorityMetrics } from '@/lib/dashboardState'
import { PRIORITY_ROW, type WidgetId } from './widgetIds'
import { renderWidget } from './widgetRegistry'

interface Props {
  state: DashboardState
  metrics: PriorityMetrics
}

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '20px',
}

export default function PriorityRow({ state, metrics }: Props) {
  const ids: WidgetId[] = PRIORITY_ROW[state]
  if (ids.length === 0) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      className="dashboard-priority-row"
      style={row}
    >
      {ids.map(id => (
        <div key={id}>{renderWidget(id, metrics)}</div>
      ))}
    </motion.section>
  )
}
