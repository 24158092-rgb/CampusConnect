import { describe, it, expect } from 'vitest'
import { events } from '@/data/events'
import { eventTimes, googleCalendarUrl } from '@/lib/calendar'

const hack = events.find((e) => e.id === 'evt-01')!

describe('calendar export', () => {
  it('converts campus time (IST) to UTC with a 2-hour slot', () => {
    // 4 Oct 2026 18:00 IST = 12:30 UTC
    expect(eventTimes(hack)).toEqual({ start: '20261004T123000Z', end: '20261004T143000Z' })
    // just after midnight IST falls on the previous UTC day
    expect(eventTimes({ date: '2026-10-05T00:15:00' }).start).toBe('20261004T184500Z')
  })

  it('builds an "Add to Google Calendar" link', () => {
    const url = new URL(googleCalendarUrl(hack, 'https://example.com'))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('text')).toBe('Hack the Campus 2026')
    expect(url.searchParams.get('dates')).toBe('20261004T123000Z/20261004T143000Z')
    expect(url.searchParams.get('location')).toBe('Innovation Lab, Block C')
    expect(url.searchParams.get('details')).toContain('https://example.com/events/evt-01')
  })
})
