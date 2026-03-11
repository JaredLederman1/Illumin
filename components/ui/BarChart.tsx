'use client'

import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface BarChartProps {
  data: { month: string; income: number; expenses: number; savings: number }[]
}

function formatK(value: number) {
  return `$${(value / 1000).toFixed(0)}k`
}

export default function BarChart({ data }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RechartsBarChart data={data} barGap={4} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,168,130,0.08)" vertical={false} />
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
          width={36}
        />
        <Tooltip
          formatter={(value, name) => [`$${Number(value).toLocaleString()}`, String(name).charAt(0).toUpperCase() + String(name).slice(1)]}
          contentStyle={{
            backgroundColor: '#140c02',
            border: '1px solid rgba(196,168,130,0.2)',
            borderRadius: '6px',
            color: '#e8d5b0',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
          }}
          cursor={{ fill: 'rgba(196,168,130,0.04)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#7a6040' }}
        />
        <Bar dataKey="income" fill="#8aad78" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" fill="#c4806a" radius={[3, 3, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
