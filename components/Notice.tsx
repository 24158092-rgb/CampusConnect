import { ReactNode } from 'react'

/** Inline success / error feedback, styled to match the card surfaces. */
export default function Notice({
  tone,
  children,
}: {
  tone: 'success' | 'error'
  children: ReactNode
}) {
  const color = tone === 'success' ? 'var(--green)' : 'var(--rust)'
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      style={{
        padding: '10px 14px',
        borderRadius: 'var(--radius)',
        borderLeft: `3px solid ${color}`,
        background: tone === 'success' ? 'var(--green-bg)' : 'var(--rust-bg)',
        color,
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  )
}
