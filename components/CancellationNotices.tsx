import Link from 'next/link'
import { dismissNoticeAction } from '@/app/actions'
import type { Registration } from '@/data/registrations'

/**
 * Site-wide banner telling a student that an organizer cancelled an event
 * they were registered for. Stays until the student dismisses it.
 */
export default function CancellationNotices({
  notices,
}: {
  notices: Registration[]
}) {
  if (notices.length === 0) return null
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
        {notices.map((notice) => (
          <li
            key={notice.id}
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
              <strong>Event cancelled:</strong> {notice.notice}{' '}
              <Link href="/registrations" style={{ fontWeight: 600 }}>
                My registrations
              </Link>
            </span>
            <form action={dismissNoticeAction}>
              <input type="hidden" name="registrationId" value={notice.id} />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ padding: '4px 12px', fontSize: 13 }}
              >
                Dismiss
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
