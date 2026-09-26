'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useNotifications } from './NotificationsProvider'

/**
 * Unread cancellations and date/venue changes, shown on every page until
 * the student marks them read.
 */
export default function AlertBanner() {
  const { status, markRead } = useNotifications()
  const [busy, setBusy] = useState<string | null>(null)
  if (status.alerts.length === 0) return null

  return (
    <div
      role="alert"
      style={{
        background: 'var(--rust-bg)',
        borderBottom: '1.5px solid var(--rust)',
      }}
    >
      <ul
        className="shell"
        style={{ padding: '12px 24px', display: 'grid', gap: 8 }}
      >
        {status.alerts.map((alert) => (
          <li
            key={alert.id}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              fontSize: 14,
              color: 'var(--rust)',
              fontWeight: 500,
            }}
          >
            <span>
              <strong>{alert.title}:</strong> {alert.message}{' '}
              <Link href="/notifications" style={{ fontWeight: 600 }}>
                All notifications
              </Link>
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: 13 }}
              disabled={busy === alert.id}
              onClick={async () => {
                setBusy(alert.id)
                await markRead(alert.id)
                setBusy(null)
              }}
            >
              {busy === alert.id ? 'Saving…' : 'Mark as read'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
