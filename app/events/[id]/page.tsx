import Link from 'next/link'
import { getEventById, getEventStatus } from '@/data/events'
import { findActiveRegistration } from '@/data/registrations'
import {
  canViewEvent,
  findOrganizerCancelledRegistration,
  listEventRegistrations,
} from '@/data/store'
import { getSessionUser } from '@/lib/session'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import Notice from '@/components/Notice'
import RegisterPanel, { RegistrationSummary } from '@/components/RegisterPanel'

export const dynamic = 'force-dynamic'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function EventDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = getSessionUser()
  const event = getEventById(params.id)

  // A student whose registration ended because the organizer cancelled
  // the event is told so, instead of a generic "not found".
  const organizerCancelled =
    user?.role === 'student' && event?.cancelled
      ? findOrganizerCancelledRegistration(user.id, event.id)
      : undefined
  if (event && organizerCancelled) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title={`${event.name} has been cancelled`}
          description="The organizer cancelled this event. Your registration has been cancelled and registration is no longer possible."
          action={
            <Link href="/events" className="btn btn-primary">
              Browse other events
            </Link>
          }
        />
      </section>
    )
  }

  // Cancelled events are otherwise hidden from students, so they get the
  // same "not on the board" state as an event that doesn't exist.
  if (!event || !canViewEvent(user, event)) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="This event isn't on the board"
          description="It may have been cancelled or removed, or the link might be wrong. Head back to the full listing to find what you're looking for."
          action={
            <Link href="/events" className="btn btn-primary">
              Back to events
            </Link>
          }
        />
      </section>
    )
  }

  const status = getEventStatus(event)
  const active =
    user?.role === 'student'
      ? findActiveRegistration(user.id, event.id)
      : undefined
  const summary: RegistrationSummary | null = active
    ? {
        mode: active.mode ?? 'individual',
        groupName: active.groupName,
        members: (
          active.members ?? [
            { name: user!.name, rollNumber: '', isLeader: true },
          ]
        ).map((m) => ({
          name: m.name,
          rollNumber: m.rollNumber,
          isLeader: m.isLeader,
        })),
      }
    : null
  const isOwner = user?.id === event.organizerId
  const attendees = isOwner ? listEventRegistrations(user, event.id) : []

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/events"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← All events
      </Link>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 32,
          marginTop: 20,
        }}
        className="hero-grid"
      >
        <div
          style={{
            display: 'grid',
            gap: 28,
            alignContent: 'start',
            minWidth: 0,
          }}
        >
          <div>
            <span className="eyebrow-tag">{event.category}</span>
            <h1 style={{ fontSize: 32, marginTop: 12 }}>{event.name}</h1>
            <p style={{ marginTop: 16, fontSize: 15.5 }}>{event.description}</p>
          </div>

          {!isOwner && (
            <RegisterPanel
              key={user?.id ?? 'guest'}
              eventId={event.id}
              status={status}
              seatsAvailable={event.seatsAvailable}
              registration={summary}
              viewer={
                user && {
                  name: user.name,
                  role: user.role,
                  profile: user.profile,
                }
              }
            />
          )}

          {isOwner && (
            <div
              className="card-surface"
              style={{ padding: 20, display: 'grid', gap: 12 }}
            >
              <h2 style={{ fontSize: 18 }}>
                Registrations ({attendees.length}
                {attendees.length === 1 ? ' entry' : ' entries'})
              </h2>
              {event.cancelled && (
                <Notice tone="error">
                  This event is cancelled. Registered students were notified.
                </Notice>
              )}
              {attendees.length === 0 ? (
                <p style={{ fontSize: 14 }}>No active registrations yet.</p>
              ) : (
                <ul style={{ display: 'grid', gap: 10 }}>
                  {attendees.map((reg) => (
                    <li
                      key={reg.id}
                      style={{
                        borderTop: '1px solid var(--line)',
                        paddingTop: 10,
                        fontSize: 14,
                      }}
                    >
                      <strong>
                        {reg.mode === 'group'
                          ? `Team "${reg.groupName}"`
                          : 'Individual'}
                      </strong>{' '}
                      · {reg.members?.length ?? 1} seat
                      {(reg.members?.length ?? 1) === 1 ? '' : 's'}
                      <ul style={{ marginTop: 4, display: 'grid', gap: 2 }}>
                        {(reg.members ?? []).map((m) => (
                          <li
                            key={m.rollNumber}
                            style={{ color: 'var(--ink-soft)' }}
                          >
                            {m.name} · {m.rollNumber} · Year {m.yearOfStudy} ·{' '}
                            {m.contactNumber} · {m.kiitEmail}
                            {reg.mode === 'group' && m.isLeader && (
                              <strong style={{ color: 'var(--green)' }}>
                                {' '}
                                · Leader
                              </strong>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <aside
          className="card-surface"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 14,
            height: 'fit-content',
          }}
        >
          <StatusBadge status={summary ? 'registered' : status} />
          <Detail label="Date" value={formatDate(event.date)} />
          <Detail label="Time" value={formatTime(event.date)} />
          <Detail label="Venue" value={event.venue} />
          <Detail
            label="Seats"
            value={`${event.seatsAvailable} of ${event.capacity} available`}
          />
          {isOwner && !event.cancelled && status !== 'past' && (
            <Link
              href={`/organizer/events/${event.id}/edit`}
              className="btn btn-secondary"
            >
              Edit event
            </Link>
          )}
        </aside>
      </div>
    </section>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{value}</div>
    </div>
  )
}
