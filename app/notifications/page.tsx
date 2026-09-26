import Link from 'next/link'
import { getEventById } from '@/data/events'
import { NOTIFICATION_LABELS, NotificationType } from '@/data/notifications'
import {
  REMINDER_WINDOW_DAYS,
  canViewEvent,
  getNotificationsFor,
} from '@/data/store'
import { getSessionUser } from '@/lib/session'
import EmptyState from '@/components/EmptyState'
import {
  MarkAllReadButton,
  MarkReadButton,
} from '@/components/NotificationButtons'

export const dynamic = 'force-dynamic'

const TONES: Record<NotificationType, { bg: string; fg: string }> = {
  registration: { bg: 'var(--green-bg)', fg: 'var(--green)' },
  'registration-cancelled': { bg: 'var(--slate-bg)', fg: 'var(--ink-soft)' },
  reminder: { bg: '#fbecd2', fg: 'var(--amber-ink)' },
  cancellation: { bg: 'var(--rust-bg)', fg: 'var(--rust)' },
  reschedule: { bg: 'var(--rust-bg)', fg: 'var(--rust)' },
  announcement: { bg: '#e3ebf5', fg: '#2f5a8a' },
  'new-registration': { bg: 'var(--green-bg)', fg: 'var(--green)' },
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  })
}

export default function NotificationsPage() {
  const user = getSessionUser()
  if (!user) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="Sign in to see your notifications"
          description="Pick your account from the menu at the top right, or sign up as a new student."
          action={
            <Link href="/signup" className="btn btn-primary">
              Sign up
            </Link>
          }
        />
      </section>
    )
  }

  const notifications = getNotificationsFor(user)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <span className="eyebrow-tag">notification center</span>
          <h1 style={{ fontSize: 30, marginTop: 10 }}>Notifications</h1>
          <p style={{ marginTop: 8 }}>
            {unread > 0 ? `${unread} unread. ` : 'You’re all caught up. '}
            {user.role === 'student'
              ? `Registration confirmations, organizer announcements, changes and cancellations land here, plus a reminder when an event you’re registered for is ${REMINDER_WINDOW_DAYS} days away or less.`
              : 'New registrations for your events land here.'}
          </p>
        </div>
        {unread > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description={
            user.role === 'student'
              ? 'Register for an event and your confirmation will show up here.'
              : 'When students register for your events, you’ll hear about it here.'
          }
        />
      ) : (
        <ul style={{ display: 'grid', gap: 10 }}>
          {notifications.map((n) => {
            const event = n.eventId ? getEventById(n.eventId) : undefined
            const linkable = event && canViewEvent(user, event)
            const tone = TONES[n.type]
            return (
              <li
                key={n.id}
                data-read={n.read ? 'true' : 'false'}
                className="card-surface"
                style={{
                  padding: '14px 18px',
                  borderLeft: n.read ? undefined : '4px solid var(--amber)',
                  background: n.read ? 'var(--paper)' : 'var(--paper-raised)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gap: 4,
                    minWidth: 0,
                    flex: '1 1 320px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11.5,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: tone.bg,
                        color: tone.fg,
                      }}
                    >
                      {NOTIFICATION_LABELS[n.type]}
                    </span>
                    <strong style={{ fontSize: 15 }}>{n.title}</strong>
                    {!n.read && (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--amber-ink)',
                          fontWeight: 600,
                        }}
                      >
                        • New
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, maxWidth: 'none' }}>{n.message}</p>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
                    {formatTime(n.createdAt)}
                    {linkable && (
                      <>
                        {' · '}
                        <Link
                          href={`/events/${event.id}`}
                          style={{ fontWeight: 600 }}
                        >
                          View event
                        </Link>
                      </>
                    )}
                  </div>
                </div>
                {!n.read && <MarkReadButton id={n.id} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
