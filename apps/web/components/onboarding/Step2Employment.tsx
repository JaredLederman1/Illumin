'use client'

import type { OnboardingData } from './shared'
import { heading, body, label, helperText, precisionCta } from './shared'
import { DefaultedInput } from './DefaultedInput'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
}

const UNLOCK_COPY: Record<'jobTitle' | 'employer' | 'employerStartDate', string> = {
  jobTitle:          'Add your job title to unlock career-trajectory benchmarks.',
  employer:          'Add your employer to unlock benefits analysis.',
  employerStartDate: 'Add your start date to calculate vesting schedules.',
}

export function Step2Employment({ data, onChange }: Props) {
  return (
    <div>
      <h1 style={heading}>Your current employment</h1>
      <p style={body}>All optional. {precisionCta}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '36px' }}>
        <div>
          <label style={label}>Job title</label>
          <DefaultedInput
            value={data.jobTitle}
            onChange={v => onChange({ jobTitle: v })}
            placeholder="Software Engineer"
            ariaLabel="Job title"
          />
          <p style={helperText}>{UNLOCK_COPY.jobTitle}</p>
        </div>

        <div>
          <label style={label}>Employer</label>
          <DefaultedInput
            value={data.employer}
            onChange={v => onChange({ employer: v })}
            placeholder="Company name"
            ariaLabel="Employer"
          />
          <p style={helperText}>{UNLOCK_COPY.employer}</p>
        </div>

        <div>
          <label style={label}>Start date with current employer</label>
          <DefaultedInput
            value={data.employerStartDate}
            onChange={v => onChange({ employerStartDate: v })}
            type="date"
            ariaLabel="Employer start date"
          />
          <p style={helperText}>{UNLOCK_COPY.employerStartDate}</p>
        </div>
      </div>
    </div>
  )
}
