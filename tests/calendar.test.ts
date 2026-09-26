import { describe, it, expect } from 'vitest'
import { events } from '@/data/events'
import { buildIcs, eventTimes, googleCalendarUrl, icsFileName } from '@/lib/calendar'

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

  it('builds a valid .ics file with two automatic reminders per event', () => {
    const ics = buildIcs([hack, events[1]], {
      siteUrl: 'https://example.com',
      now: new Date(Date.UTC(2026, 8, 16, 3, 30)),
    })
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(4)
    expect(ics).toContain('TRIGGER:-P1D')
    expect(ics).toContain('TRIGGER:-PT1H')
    expect(ics).toContain('DTSTART:20261004T123000Z')
    expect(ics).toContain('DTSTAMP:20260916T033000Z')
    expect(ics).toContain('UID:evt-01@campus-connect')
    // commas are escaped in text values
    expect(ics).toContain('LOCATION:Innovation Lab\\, Block C')
    // every line is CRLF-terminated and at most 75 octets
    for (const line of ics.split('\r\n')) {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75)
    }
    // unfolding restores the long description
    const unfolded = ics.replace(/\r\n /g, '')
    expect(unfolded).toContain('Food\\, mentors\\, and a closing demo night included.')
  })

  it('makes safe file names', () => {
    expect(icsFileName('Inter-Hostel Football Cup — Final')).toBe('inter-hostel-football-cup-final.ics')
    expect(icsFileName('!!!')).toBe('event.ics')
  })
})
