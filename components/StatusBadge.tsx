export type Status = 'open' | 'full' | 'past' | 'cancelled' | 'registered'

const COPY: Record<Status, string> = {
  open: 'Open',
  full: 'Full',
  past: 'Past',
  cancelled: 'Cancelled',
  registered: 'Registered',
}

const COLORS: Record<Status, { bg: string; fg: string }> = {
  open: { bg: 'var(--green-bg)', fg: 'var(--green)' },
  full: { bg: 'var(--rust-bg)', fg: 'var(--rust)' },
  past: { bg: 'var(--slate-bg)', fg: 'var(--ink-soft)' },
  cancelled: { bg: 'var(--rust-bg)', fg: 'var(--rust)' },
  registered: { bg: 'var(--green-bg)', fg: 'var(--green)' },
}

export default function StatusBadge({ status }: { status: Status }) {
  const { bg, fg } = COLORS[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        padding: '3px 8px',
        borderRadius: '999px',
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {COPY[status]}
    </span>
  )
}
