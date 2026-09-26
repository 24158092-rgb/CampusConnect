import EventBrowser from '@/components/EventBrowser'
import { listUpcomingEvents } from '@/data/store'

export const dynamic = 'force-dynamic'

// Rendered on the server so it always reads the live store, including
// events organizers created after the page was built.
export default function EventsPage() {
  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">the board</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>Upcoming events</h1>
        <p style={{ marginTop: 8 }}>
          Everything clubs and departments have coming up this semester.
        </p>
      </div>

      <EventBrowser events={listUpcomingEvents()} />
    </section>
  )
}
