'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ForecastChartProps {
  data: { month: string; balance: number; projected: boolean }[]
  emergencyFundMonths: number
}

function formatK(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

export default function ForecastChart({ data, emergencyFundMonths }: ForecastChartProps) {
  // Split into actual vs projected series for separate styling
  const chartData = data.map(d => ({
    month: d.month,
    actual: d.projected ? null : d.balance,
    projected: d.projected ? d.balance : null,
  }))

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.08)" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#7a6040', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#7a6040', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Balance']}
            contentStyle={{
              backgroundColor: '#140c02',
              border: '1px solid rgba(196,168,130,0.2)',
              borderRadius: '6px',
              color: '#e8d5b0',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#c4a882"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#c4a882"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        backgroundColor: 'rgba(138,173,120,0.08)',
        border: '1px solid rgba(138,173,120,0.2)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>◎</span>
        <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#8aad78' }}>
          Projected emergency fund coverage: <strong>{emergencyFundMonths.toFixed(1)} months</strong>
        </span>
      </div>
    </div>
  )
}
