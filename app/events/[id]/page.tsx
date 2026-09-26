import Link from 'next/link'
import { getEventById, getEventStatus } from '@/data/events'
import { findActiveRegistration } from '@/data/registrations'
import { canViewEvent } from '@/data/store'
import { getSessionUser } from '@/lib/session'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import RegisterPanel from '@/components/RegisterPanel'

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

  // Cancelled events are hidden from students, so they get the same
  // "not on the board" state as an event that doesn't exist.
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
  const registered =
    user?.role === 'student' && !!findActiveRegistration(user.id, event.id)

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
        <div>
          <span className="eyebrow-tag">{event.category}</span>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>{event.name}</h1>
          <p style={{ marginTop: 16, fontSize: 15.5 }}>{event.description}</p>
        </div>

        <aside
          className="card-surface"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            height: 'fit-content',
          }}
        >
          <StatusBadge status={registered ? 'registered' : status} />
          <Detail label="Date" value={formatDate(event.date)} />
          <Detail label="Time" value={formatTime(event.date)} />
          <Detail label="Venue" value={event.venue} />
          <Detail
            label="Seats"
            value={`${event.seatsAvailable} of ${event.capacity} available`}
          />

          <RegisterPanel
            eventId={event.id}
            status={status}
            registered={registered}
            viewer={user && { name: user.name, role: user.role }}
          />
          {user?.id === event.organizerId && !event.cancelled && status !== 'past' && (
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
