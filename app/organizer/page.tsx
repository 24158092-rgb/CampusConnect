import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import {
  CampusEvent,
  getEventById,
  getEventStatus,
  getSeatsTaken,
  isPastEvent,
  sortEvents,
} from '@/data/events'
import { listEventsForOrganizer } from '@/data/store'
import { cancelEventAction, deleteEventAction } from '@/app/actions'
import EmptyState from '@/components/EmptyState'
import StatusBadge from '@/components/StatusBadge'
import Notice from '@/components/Notice'
import ConfirmActionButton from '@/components/ConfirmActionButton'
import { OrganizerOnly } from './OrganizerGate'

export const dynamic = 'force-dynamic'

const DONE_COPY: Record<string, (name: string) => string> = {
  created: (name) => `${name} is now on the board.`,
  updated: (name) => `${name} was updated.`,
  cancelled: (name) =>
    `${name} was cancelled. Registered students have been notified, and it's hidden from the board.`,
}

export default function OrganizerPage({
  searchParams,
}: {
  searchParams: { done?: string; event?: string }
}) {
  const currentUser = getSessionUser()
  if (currentUser?.role !== 'organizer') {
    return <OrganizerOnly user={currentUser} />
  }

  const myEvents = sortEvents(listEventsForOrganizer(currentUser.id), 'date')
  const sections = [
    {
      title: 'Upcoming',
      empty: 'No upcoming events. Post one with “+ New event”.',
      events: myEvents.filter((e) => !e.cancelled && !isPastEvent(e)),
    },
    {
      title: 'Past',
      empty: 'No past events yet.',
      events: myEvents.filter((e) => !e.cancelled && isPastEvent(e)).reverse(),
    },
    {
      title: 'Cancelled',
      empty: 'You haven’t cancelled any events.',
      events: myEvents.filter((e) => e.cancelled),
    },
  ]

  // Feedback after a create / edit / cancel / delete redirect.
  const doneEvent = searchParams.event && getEventById(searchParams.event)
  const notice =
    searchParams.done === 'deleted'
      ? 'The event and its registrations were deleted.'
      : searchParams.done &&
          DONE_COPY[searchParams.done] &&
          doneEvent &&
          doneEvent.organizerId === currentUser.id
        ? DONE_COPY[searchParams.done](doneEvent.name)
        : null

  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div
        style={{
          marginBottom: 28,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <span className="eyebrow-tag">organizer console</span>
          <h1 style={{ fontSize: 30, marginTop: 10 }}>Manage your events</h1>
          <p style={{ marginTop: 8 }}>
            Signed in as {currentUser.name}. You can edit, cancel, or delete the
            events you organize.
          </p>
        </div>
        <Link href="/organizer/events/new" className="btn btn-primary">
          + New event
        </Link>
      </div>

      {notice && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="success">{notice}</Notice>
        </div>
      )}

      {myEvents.length === 0 ? (
        <EmptyState
          title="No events posted yet"
          description="Once you create an event, it'll show up here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sections.map((section) => (
            <div key={section.title}>
              <h2 style={{ fontSize: 20, marginBottom: 14 }}>
                {section.title}{' '}
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--ink-soft)',
                    fontWeight: 500,
                  }}
                >
                  ({section.events.length})
                </span>
              </h2>
              {section.events.length === 0 ? (
                <p style={{ fontSize: 14 }}>{section.empty}</p>
              ) : (
                <EventRows events={section.events} />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function EventRows({ events }: { events: CampusEvent[] }) {
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {events.map((event) => {
        const status = getEventStatus(event)
        const editable = status !== 'cancelled' && status !== 'past'
        return (
          <li
            key={event.id}
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
                {new Date(event.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                · {event.venue} · {getSeatsTaken(event)} taken,{' '}
                {event.seatsAvailable}/{event.capacity} seats left
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
              <StatusBadge status={status} />
              {editable && (
                <Link
                  href={`/organizer/events/${event.id}/edit`}
                  className="btn btn-secondary"
                >
                  Edit
                </Link>
              )}
              {editable && (
                <ConfirmActionButton
                  action={cancelEventAction}
                  fields={{ eventId: event.id }}
                  label="Cancel"
                  pendingLabel="Cancelling…"
                  confirmMessage={`Cancel ${event.name}? Every registration for it will be cancelled, registered students will be notified, and it will be hidden from the board.`}
                />
              )}
              <ConfirmActionButton
                action={deleteEventAction}
                fields={{ eventId: event.id }}
                label="Delete"
                pendingLabel="Deleting…"
                confirmMessage={`Permanently delete ${event.name}? Anyone still registered will be notified. This can't be undone.`}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
