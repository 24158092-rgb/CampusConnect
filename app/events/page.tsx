import EventBrowser from '@/components/EventBrowser'
import Notice from '@/components/Notice'
import { listUpcomingEvents } from '@/data/store'
import { getSessionUser } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Rendered on the server so it always reads the live store, including
// events organizers created after the page was built.
export default function EventsPage({
  searchParams,
}: {
  searchParams: { welcome?: string }
}) {
  const user = getSessionUser()
  return (
    <section className="shell" style={{ padding: '40px 0 64px' }}>
      <div style={{ marginBottom: 28 }}>
        <span className="eyebrow-tag">the board</span>
        <h1 style={{ fontSize: 30, marginTop: 10 }}>Upcoming events</h1>
        <p style={{ marginTop: 8 }}>
          Everything clubs and departments have coming up this semester.
        </p>
      </div>

      {searchParams.welcome && user?.role === 'student' && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="success">
            Welcome, {user.name}! Your account is ready and you’re signed in.
            Pick an event to register.
          </Notice>
        </div>
      )}

      <EventBrowser events={listUpcomingEvents()} />
    </section>
  )
}
