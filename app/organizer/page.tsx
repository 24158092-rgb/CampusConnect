import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import { getEventById, getEventStatus, getSeatsTaken, sortEvents } from '@/data/events'
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
    `${name} was cancelled. Its registrations were cancelled and it's hidden from students.`,
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
            Signed in as {currentUser.name}. You can edit, cancel, or delete
            the events you organize.
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
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myEvents.map((event) => {
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
                      confirmMessage={`Cancel ${event.name}? Every registration for it will be cancelled and students won't see it any more.`}
                    />
                  )}
                  <ConfirmActionButton
                    action={deleteEventAction}
                    fields={{ eventId: event.id }}
                    label="Delete"
                    pendingLabel="Deleting…"
                    confirmMessage={`Permanently delete ${event.name} and all of its registrations? This can't be undone.`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
