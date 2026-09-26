import Link from 'next/link'
import { CampusEvent, getEventStatus } from '@/data/events'
import StatusBadge from './StatusBadge'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function EventCard({ event }: { event: CampusEvent }) {
  const status = getEventStatus(event)

  return (
    <Link href={`/events/${event.id}`} className="event-card">
      <div className="event-card__main">
        <span className="event-card__category">{event.category}</span>
        <h3 className="event-card__name">{event.name}</h3>
        <div className="event-card__meta">
          <span>{formatDate(event.date)}</span>
          <span>·</span>
          <span>{event.venue}</span>
        </div>
      </div>
      <div className="event-card__stub">
        <StatusBadge status={status} />
        <span className="event-card__seats">
          {event.seatsAvailable} of {event.capacity} seats left
        </span>
      </div>
    </Link>
  )
}
