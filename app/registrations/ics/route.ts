import { getStudentRegistrations } from '@/data/store'
import { buildIcs } from '@/lib/calendar'
import { getSessionUser } from '@/lib/session'
import { getSiteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

/** GET /registrations/ics — all of the student's upcoming registrations. */
export function GET() {
  const user = getSessionUser()
  if (!user || user.role !== 'student') {
    return new Response('Sign in as a student to export your registrations.', {
      status: 401,
    })
  }
  const events = getStudentRegistrations(user.id).upcoming.map(
    (entry) => entry.event,
  )
  const ics = buildIcs(events, {
    siteUrl: getSiteUrl(),
    calendarName: `Campus Connect — ${user.name}`,
  })
  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="campus-connect-registrations.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
