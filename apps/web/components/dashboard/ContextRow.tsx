'use client'

import { motion } from 'framer-motion'
import type { PriorityMetrics } from '@/lib/dashboardState'
import { CONTEXT_ROW, type WidgetId } from './widgetIds'
import { renderWidget } from './widgetRegistry'

interface Props {
  exclude: Set<WidgetId>
  metrics: PriorityMetrics
}

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '20px',
}

export default function ContextRow({ exclude, metrics }: Props) {
  const ids = CONTEXT_ROW.filter(id => !exclude.has(id))
  if (ids.length === 0) return null
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.16 }}
      className="dashboard-context-row"
      style={row}
    >
      {ids.map(id => (
        <div key={id}>{renderWidget(id, metrics)}</div>
      ))}
    </motion.section>
  )
}
