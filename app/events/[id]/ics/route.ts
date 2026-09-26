import { getEventById } from '@/data/events'
import { canViewEvent } from '@/data/store'
import { buildIcs, icsFileName } from '@/lib/calendar'
import { getSessionUser } from '@/lib/session'
import { getSiteUrl } from '@/lib/site'

export const dynamic = 'force-dynamic'

/** GET /events/:id/ics — one event as an .ics file for any calendar app. */
export function GET(_request: Request, { params }: { params: { id: string } }) {
  const event = getEventById(params.id)
  if (!event || !canViewEvent(getSessionUser(), event)) {
    return new Response('Event not found', { status: 404 })
  }
  return new Response(buildIcs([event], { siteUrl: getSiteUrl() }), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${icsFileName(event.name)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
