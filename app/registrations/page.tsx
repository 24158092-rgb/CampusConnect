import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import { getEventById } from '@/data/events'
import { registrations } from '@/data/registrations'
import {
  CancelledRegistration,
  StudentRegistration,
  getStudentRegistrations,
} from '@/data/store'
import { isFullEvent } from '@/data/events'
import { cancelRegistrationAction } from '@/app/actions'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import Notice from '@/components/Notice'
import ConfirmActionButton from '@/components/ConfirmActionButton'
import type { Registration } from '@/data/registrations'
import { googleCalendarUrl } from '@/lib/calendar'
import { getSiteUrl } from '@/lib/site'

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
          title={
            currentUser
              ? 'This page is for students'
              : 'Sign in to see your registrations'
          }
          description="Switch to a student account from the top-right menu to see registered events."
        />
      </section>
    )
  }

  const {
    upcoming,
    past,
    cancelled: cancelledByMe,
    cancelledByOrganizer,
  } = getStudentRegistrations(currentUser.id)

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
          free your seat; you can register again later while the event is still
          open.
        </p>
        {upcoming.length > 0 && (
          <div
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}
          >
            <a
              href="/registrations/ics"
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 13.5 }}
            >
              Add all upcoming to my calendar (.ics)
            </a>
            <Link
              href="/calendar?view=mine"
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 13.5 }}
            >
              Calendar view
            </Link>
          </div>
        )}
      </div>

      {cancelledEvent && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="success">
            Your registration for {cancelledEvent.name} was cancelled and its
            {cancelled && (cancelled.members?.length ?? 1) > 1
              ? ' seats have'
              : ' seat has'}{' '}
            been released. It’s listed under Cancelled below if you want to
            register again.
          </Notice>
        </div>
      )}

      {cancelledByOrganizer.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 14 }}>
            Cancelled by the organizer{' '}
            <span
              style={{
                fontSize: 14,
                color: 'var(--ink-soft)',
                fontWeight: 500,
              }}
            >
              ({cancelledByOrganizer.length})
            </span>
          </h2>
          <ul style={{ display: 'grid', gap: 10 }}>
            {cancelledByOrganizer.map((reg) => (
              <li key={reg.id}>
                <Notice tone="error">{reg.notice}</Notice>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length === 0 &&
      past.length === 0 &&
      cancelledByMe.length === 0 ? (
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
          <CancelledGroup entries={cancelledByMe} />
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
  const siteUrl = getSiteUrl()
  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 14 }}>
        {title}{' '}
        <span
          style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 500 }}
        >
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
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--ink-soft)',
                    marginTop: 2,
                  }}
                >
                  {describeRegistration(registration)}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <StatusBadge status={cancellable ? 'registered' : 'past'} />
                {cancellable && (
                  <a
                    href={googleCalendarUrl(event, siteUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  >
                    Google Calendar
                  </a>
                )}
                {cancellable && (
                  <a
                    href={`/events/${event.id}/ics`}
                    style={{ fontSize: 13.5, fontWeight: 600 }}
                  >
                    .ics
                  </a>
                )}
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

function describeRegistration(registration: Registration): string {
  if (registration.mode !== 'group') return 'Individual registration'
  const count = registration.members?.length ?? 1
  const leader = registration.members?.find((m) => m.isLeader)
  return `Team "${registration.groupName}" · ${count} members${leader ? ` · Leader: ${leader.name}` : ''}`
}

function CancelledGroup({ entries }: { entries: CancelledRegistration[] }) {
  return (
    <div>
      <h2 style={{ fontSize: 20, marginBottom: 14 }}>
        Cancelled{' '}
        <span
          style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 500 }}
        >
          ({entries.length})
        </span>
      </h2>
      {entries.length === 0 ? (
        <p style={{ fontSize: 14 }}>You haven’t cancelled any registrations.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map(({ registration, event, canRegisterAgain }) => (
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
                <div
                  style={{
                    fontSize: 13.5,
                    color: 'var(--ink-soft)',
                    marginTop: 2,
                  }}
                >
                  {describeRegistration(registration)}
                  {registration.cancelledAt &&
                    ` · Cancelled by you on ${new Date(registration.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <StatusBadge status="cancelled" />
                {canRegisterAgain && !isFullEvent(event) ? (
                  <Link
                    href={`/events/${event.id}`}
                    className="btn btn-secondary"
                  >
                    Register again
                  </Link>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                    {canRegisterAgain ? 'Event is full' : 'Event is over'}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
