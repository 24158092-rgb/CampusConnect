import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import { getEventById } from '@/data/events'
import { registrations } from '@/data/registrations'
import { StudentRegistration, getStudentRegistrations } from '@/data/store'
import { cancelRegistrationAction } from '@/app/actions'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import Notice from '@/components/Notice'
import ConfirmActionButton from '@/components/ConfirmActionButton'

export const dynamic = 'force-dynamic'

function formatWhen(iso: string) {
  const date = new Date(iso)
  return `${date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}, ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
}

export default function RegistrationsPage({
  searchParams,
}: {
  searchParams: { cancelled?: string }
}) {
  const currentUser = getSessionUser()

  if (!currentUser || currentUser.role !== 'student') {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title={currentUser ? 'This page is for students' : 'Sign in to see your registrations'}
          description="Switch to a student account from the top-right menu to see registered events."
        />
      </section>
    )
  }

  const { upcoming, past } = getStudentRegistrations(currentUser.id)

  // Feedback after a cancellation (the cancelled row itself is gone).
  const cancelled = registrations.find(
    (reg) =>
      reg.id === searchParams.cancelled &&
      reg.studentId === currentUser.id &&
      reg.status === 'cancelled',
  )
  const cancelledEvent = cancelled && getEventById(cancelled.eventId)

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">signed up as {currentUser.name}</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>My registrations</h1>
        <p style={{ marginTop: 8 }}>
          Everything you’ve registered for. Cancel an upcoming registration to
          free your seat for someone else.
        </p>
      </div>

      {cancelledEvent && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="success">
            Your registration for {cancelledEvent.name} was cancelled and your
            seat has been released.
          </Notice>
        </div>
      )}

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          title="No registrations yet"
          description="Once you register for an event, it'll show up here."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse events
            </Link>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <RegistrationGroup
            title="Upcoming"
            entries={upcoming}
            emptyText="No upcoming registrations. Find something on the board."
            cancellable
          />
          <RegistrationGroup
            title="Past"
            entries={past}
            emptyText="No past events yet."
          />
        </div>
      )}
    </section>
  )
}

function RegistrationGroup({
  title,
  entries,
  emptyText,
  cancellable = false,
}: {
  title: string
  entries: StudentRegistration[]
  emptyText: string
  cancellable?: boolean
}) {
  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 14 }}>
        {title}{' '}
        <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 500 }}>
          ({entries.length})
        </span>
      </h2>
      {entries.length === 0 ? (
        <p style={{ fontSize: 14 }}>{emptyText}</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(({ registration, event }) => (
            <li
              key={registration.id}
              className="card-surface"
              style={{
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <Link
                  href={`/events/${event.id}`}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 17,
                    textDecoration: 'none',
                  }}
                >
                  {event.name}
                </Link>
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--ink-soft)',
                    marginTop: 4,
                  }}
                >
                  {formatWhen(event.date)} · {event.venue}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status={cancellable ? 'registered' : 'past'} />
                {cancellable && (
                  <ConfirmActionButton
                    action={cancelRegistrationAction}
                    fields={{ registrationId: registration.id }}
                    label="Cancel"
                    pendingLabel="Cancelling…"
                    confirmMessage={`Cancel your registration for ${event.name}?`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
