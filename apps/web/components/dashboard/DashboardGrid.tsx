'use client'

import type { DashboardState, PriorityMetrics } from '@/lib/dashboardState'
import PriorityRow from './PriorityRow'
import ContextRow from './ContextRow'
import ReferenceRow from './ReferenceRow'
import SharpenForecastWidget from './SharpenForecastWidget'
import { PRIORITY_ROW, type WidgetId } from './widgetIds'

interface Props {
  state: DashboardState
  priorityMetrics: PriorityMetrics
}

/**
 * Dedup rule: if a widget appears in Priority for the current state, it is
 * excluded from Context and Reference. Priority > Context > Reference.
 */
function buildExcludeSets(state: DashboardState): {
  contextExclude: Set<WidgetId>
  referenceExclude: Set<WidgetId>
} {
  const priorityIds = new Set<WidgetId>(PRIORITY_ROW[state])
  return {
    contextExclude: new Set(priorityIds),
    referenceExclude: new Set(priorityIds),
  }
}

export default function DashboardGrid({ state, priorityMetrics }: Props) {
  const { contextExclude, referenceExclude } = buildExcludeSets(state)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <PriorityRow state={state} metrics={priorityMetrics} />
      <SharpenForecastWidget />
      <ContextRow exclude={contextExclude} metrics={priorityMetrics} />
      <ReferenceRow exclude={referenceExclude} metrics={priorityMetrics} />
    </div>
  )
}
