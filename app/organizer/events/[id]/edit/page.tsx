import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import { isPastEvent } from '@/data/events'
import { getOwnedEvent } from '@/data/store'
import EventForm from '@/components/EventForm'
import EmptyState from '@/components/EmptyState'
import { OrganizerOnly, dateFieldProps } from '../../../OrganizerGate'

export const dynamic = 'force-dynamic'

export default function EditEventPage({ params }: { params: { id: string } }) {
  const user = getSessionUser()
  if (user?.role !== 'organizer') return <OrganizerOnly user={user} />

  const owned = getOwnedEvent(user, params.id)
  const blocked = !owned.ok
    ? owned.error
    : owned.data.cancelled
      ? "Cancelled events can't be edited."
      : isPastEvent(owned.data)
        ? "This event has already happened, so it can't be edited."
        : null

  if (!owned.ok || blocked) {
    return (
      <section className="shell" style={{ padding: '56px 0' }}>
        <EmptyState
          title="You can't edit this event"
          description={blocked ?? ''}
          action={
            <Link href="/organizer" className="btn btn-primary">
              Back to organizer console
            </Link>
          }
        />
      </section>
    )
  }

  const event = owned.data
  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <Link
        href="/organizer"
        style={{ fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
      >
        ← Organizer console
      </Link>
      <h1 style={{ fontSize: 30, margin: '16px 0 24px' }}>Edit {event.name}</h1>
      <EventForm
        eventId={event.id}
        initial={{
          name: event.name,
          description: event.description,
          date: event.date.slice(0, 16),
          venue: event.venue,
          category: event.category,
          capacity: String(event.capacity),
        }}
        {...dateFieldProps()}
      />
    </section>
  )
}
