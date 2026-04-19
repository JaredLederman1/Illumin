'use client'

import type { OnboardingData } from './shared'
import { heading, label } from './shared'
import { DefaultedInput } from './DefaultedInput'

interface Props {
  data: OnboardingData
  onChange: (patch: Partial<OnboardingData>) => void
}

export function Step2Employment({ data, onChange }: Props) {
  return (
    <div>
      <h1 style={heading}>Your current employment</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '36px' }}>
        <div>
          <label style={label}>Job title</label>
          <DefaultedInput
            value={data.jobTitle}
            onChange={v => onChange({ jobTitle: v })}
            placeholder="Software Engineer"
            ariaLabel="Job title"
          />
        </div>

        <div>
          <label style={label}>Employer</label>
          <DefaultedInput
            value={data.employer}
            onChange={v => onChange({ employer: v })}
            placeholder="Company name"
            ariaLabel="Employer"
          />
        </div>

        <div>
          <label style={label}>Start date</label>
          <DefaultedInput
            value={data.employerStartDate}
            onChange={v => onChange({ employerStartDate: v })}
            type="date"
            ariaLabel="Employer start date"
          />
        </div>
      </div>
    </div>
  )
}
