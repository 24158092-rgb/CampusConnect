import { describe, it, expect, beforeEach, vi } from 'vitest'

// The store mutates the seed arrays (pinned on globalThis), so every test
// clears them and loads a fresh copy of the modules.
let eventsMod: typeof import('@/data/events')
let regsMod: typeof import('@/data/registrations')
let store: typeof import('@/data/store')
let auth: typeof import('@/data/auth')

beforeEach(async () => {
  const shared = globalThis as Record<string, unknown>
  delete shared.__campusEvents
  delete shared.__campusRegistrations
  delete shared.__campusIdSeq
  vi.resetModules()
  eventsMod = await import('@/data/events')
  regsMod = await import('@/data/registrations')
  store = await import('@/data/store')
  auth = await import('@/data/auth')
})

const student = () => auth.getUserById('stu-1')!
const organizer = () => auth.getUserById('org-1')!
const event = (id: string) => eventsMod.getEventById(id)!

const validInput = {
  name: 'Robotics Demo Day',
  description: 'Bots, drones, and a sumo ring.',
  date: '2026-11-20T15:00',
  venue: 'Innovation Lab, Block C',
  category: 'Tech',
  capacity: '50',
}

describe('event listing', () => {
  it('search is partial and case-insensitive', () => {
    const results = eventsMod.searchEventsByName(eventsMod.events, 'NIGHT')
    expect(results.map((e) => e.id).sort()).toEqual(['evt-02', 'evt-11'])
  })

  it('blank search returns everything', () => {
    expect(eventsMod.searchEventsByName(eventsMod.events, '  ')).toHaveLength(15)
  })

  it('category filter composes with search', () => {
    const tech = eventsMod.filterEventsByCategory(eventsMod.events, 'Tech')
    expect(tech.every((e) => e.category === 'Tech')).toBe(true)
    const both = eventsMod.filterEventsByCategory(
      eventsMod.searchEventsByName(eventsMod.events, 'CAMPUS'),
      'Tech',
    )
    expect(both.map((e) => e.id)).toEqual(['evt-01'])
    expect(eventsMod.filterEventsByCategory(eventsMod.events, 'All')).toHaveLength(15)
  })

  it('lists only upcoming, non-cancelled events', () => {
    event('evt-06').cancelled = true
    const upcoming = store.listUpcomingEvents()
    expect(upcoming.some((e) => eventsMod.isPastEvent(e))).toBe(false)
    expect(upcoming.some((e) => e.id === 'evt-06')).toBe(false)
    expect(upcoming.some((e) => e.id === 'evt-01')).toBe(true)
  })

  it('sorts by date and by popularity', () => {
    const byDate = eventsMod.sortEvents(store.listUpcomingEvents(), 'date')
    expect(byDate[0].id).toBe('evt-03')
    const byPopularity = eventsMod.sortEvents(store.listUpcomingEvents(), 'popularity')
    // evt-02: 80 taken, evt-09: 112 taken, evt-01: 83 taken
    expect(byPopularity.slice(0, 3).map((e) => e.id)).toEqual(['evt-09', 'evt-01', 'evt-02'])
  })
})

describe('registration', () => {
  it('registers a student and takes a seat', () => {
    const before = event('evt-05').seatsAvailable
    const result = store.registerForEvent(student(), 'evt-05')
    expect(result.ok).toBe(true)
    expect(event('evt-05').seatsAvailable).toBe(before - 1)
    expect(regsMod.findActiveRegistration('stu-1', 'evt-05')).toBeDefined()
  })

  it('requires login and a student account', () => {
    expect(store.registerForEvent(null, 'evt-05')).toMatchObject({ ok: false })
    expect(store.registerForEvent(organizer(), 'evt-05')).toMatchObject({ ok: false })
    expect(event('evt-05').seatsAvailable).toBe(6)
  })

  it('blocks duplicates without touching seats', () => {
    const before = event('evt-01').seatsAvailable
    const result = store.registerForEvent(student(), 'evt-01')
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/already registered/) })
    expect(event('evt-01').seatsAvailable).toBe(before)
    expect(regsMod.registrations.filter((r) => r.eventId === 'evt-01')).toHaveLength(1)
  })

  it('blocks full, past, cancelled, and missing events', () => {
    expect(store.registerForEvent(student(), 'evt-02')).toMatchObject({ ok: false, error: expect.stringMatching(/full/) })
    expect(store.registerForEvent(student(), 'evt-10')).toMatchObject({ ok: false, error: expect.stringMatching(/already taken place/) })
    event('evt-06').cancelled = true
    expect(store.registerForEvent(student(), 'evt-06')).toMatchObject({ ok: false, error: expect.stringMatching(/cancelled/) })
    expect(store.registerForEvent(student(), 'nope')).toMatchObject({ ok: false })
    expect(event('evt-02').seatsAvailable).toBe(0)
  })

  it('takes the last seat, then reports the event full', () => {
    event('evt-05').seatsAvailable = 1
    expect(store.registerForEvent(student(), 'evt-05').ok).toBe(true)
    expect(event('evt-05').seatsAvailable).toBe(0)
    expect(eventsMod.isFullEvent(event('evt-05'))).toBe(true)
  })

  it('re-registering after cancelling reuses the same record', () => {
    store.registerForEvent(student(), 'evt-05')
    const reg = regsMod.findActiveRegistration('stu-1', 'evt-05')!
    store.cancelRegistration(student(), reg.id)
    const again = store.registerForEvent(student(), 'evt-05')
    expect(again.ok && again.data.id).toBe(reg.id)
    expect(regsMod.registrations.filter((r) => r.eventId === 'evt-05')).toHaveLength(1)
    expect(event('evt-05').seatsAvailable).toBe(5)
  })
})

describe('cancelling a registration', () => {
  it('marks it cancelled, frees the seat, and hides it', () => {
    const before = event('evt-01').seatsAvailable
    const result = store.cancelRegistration(student(), 'reg-01')
    expect(result.ok).toBe(true)
    expect(event('evt-01').seatsAvailable).toBe(before + 1)
    expect(regsMod.registrations.find((r) => r.id === 'reg-01')!.status).toBe('cancelled')
    expect(regsMod.getRegistrationsForStudent('stu-1').some((r) => r.id === 'reg-01')).toBe(false)
    expect(regsMod.getRegistrationsForStudent('stu-1', { includeCancelled: true })).toHaveLength(3)
  })

  it('does not give the seat back twice', () => {
    const before = event('evt-01').seatsAvailable
    store.cancelRegistration(student(), 'reg-01')
    expect(store.cancelRegistration(student(), 'reg-01').ok).toBe(false)
    expect(event('evt-01').seatsAvailable).toBe(before + 1)
  })

  it("refuses other students' registrations and past events", () => {
    const other = { id: 'stu-2', name: 'Other', role: 'student' as const }
    expect(store.cancelRegistration(other, 'reg-01').ok).toBe(false)
    expect(store.cancelRegistration(null, 'reg-01').ok).toBe(false)
    // reg-02 is for evt-04, which is in the past
    expect(store.cancelRegistration(student(), 'reg-02').ok).toBe(false)
  })

  it('never pushes seats above capacity', () => {
    event('evt-01').seatsAvailable = event('evt-01').capacity
    store.cancelRegistration(student(), 'reg-01')
    expect(event('evt-01').seatsAvailable).toBe(event('evt-01').capacity)
  })
})

describe('my registrations', () => {
  it('groups into upcoming and past and skips cancelled ones', () => {
    const { upcoming, past } = store.getStudentRegistrations('stu-1')
    expect(upcoming.map((e) => e.event.id)).toEqual(['evt-01', 'evt-09'])
    expect(past.map((e) => e.event.id)).toEqual(['evt-04'])

    store.cancelRegistration(student(), 'reg-01')
    expect(store.getStudentRegistrations('stu-1').upcoming.map((e) => e.event.id)).toEqual(['evt-09'])
  })

  it('hides registrations for cancelled events', () => {
    store.cancelEvent(auth.getUserById('org-3')!, 'evt-09')
    expect(store.getStudentRegistrations('stu-1').upcoming.map((e) => e.event.id)).toEqual(['evt-01'])
  })
})

describe('organizer management', () => {
  it('validates name, future date, venue, category, and capacity', () => {
    const result = store.validateEventInput({
      name: ' ',
      date: '2026-09-01T10:00',
      venue: '',
      category: 'Party',
      capacity: '0',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(
        ['capacity', 'category', 'date', 'name', 'venue'],
      )
    }
    expect(store.validateEventInput({ ...validInput, capacity: '2.5' }).ok).toBe(false)
    expect(store.validateEventInput({ ...validInput, date: 'tomorrow' }).ok).toBe(false)
    expect(store.validateEventInput(validInput).ok).toBe(true)
  })

  it('creates an event owned by the organizer with every seat free', () => {
    const result = store.createEvent(organizer(), validInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toMatchObject({
      id: 'evt-16',
      organizerId: 'org-1',
      capacity: 50,
      seatsAvailable: 50,
      date: '2026-11-20T15:00:00',
      cancelled: false,
    })
    expect(store.listUpcomingEvents()).toContainEqual(result.data)
  })

  it('only organizers can create events', () => {
    expect(store.createEvent(student(), validInput).ok).toBe(false)
    expect(store.createEvent(null, validInput).ok).toBe(false)
    expect(eventsMod.events).toHaveLength(15)
  })

  it('editing keeps taken seats and rejects capacity below them', () => {
    // evt-01: capacity 120, 37 free → 83 taken
    const ok = store.updateEvent(organizer(), 'evt-01', { ...validInput, capacity: '100' })
    expect(ok.ok).toBe(true)
    expect(event('evt-01')).toMatchObject({ capacity: 100, seatsAvailable: 17, name: validInput.name })

    const tooSmall = store.updateEvent(organizer(), 'evt-01', { ...validInput, capacity: '50' })
    expect(tooSmall).toMatchObject({ ok: false, fieldErrors: { capacity: expect.any(String) } })
    expect(event('evt-01').capacity).toBe(100)
  })

  it("organizers can't touch other organizers' events", () => {
    expect(store.updateEvent(organizer(), 'evt-02', validInput).ok).toBe(false)
    expect(store.cancelEvent(organizer(), 'evt-02').ok).toBe(false)
    expect(store.deleteEvent(organizer(), 'evt-02').ok).toBe(false)
    expect(store.cancelEvent(student(), 'evt-01').ok).toBe(false)
  })

  it('cancelling an event cancels its registrations and hides it', () => {
    const before = event('evt-01').seatsAvailable
    expect(store.cancelEvent(organizer(), 'evt-01').ok).toBe(true)
    expect(event('evt-01').cancelled).toBe(true)
    expect(regsMod.registrations.find((r) => r.id === 'reg-01')!.status).toBe('cancelled')
    expect(event('evt-01').seatsAvailable).toBe(before + 1)
    expect(store.canViewEvent(student(), event('evt-01'))).toBe(false)
    expect(store.canViewEvent(null, event('evt-01'))).toBe(false)
    expect(store.canViewEvent(organizer(), event('evt-01'))).toBe(true)
    expect(store.cancelEvent(organizer(), 'evt-01').ok).toBe(false)
    expect(store.updateEvent(organizer(), 'evt-01', validInput).ok).toBe(false)
  })

  it('deleting an event removes it and its registrations', () => {
    expect(store.deleteEvent(organizer(), 'evt-01').ok).toBe(true)
    expect(eventsMod.getEventById('evt-01')).toBeUndefined()
    expect(regsMod.registrations.some((r) => r.eventId === 'evt-01')).toBe(false)
    // ids are not reused after the newest event is deleted
    const org4 = auth.getUserById('org-4')!
    expect(store.deleteEvent(org4, 'evt-15').ok).toBe(true)
    const created = store.createEvent(org4, validInput)
    expect(created.ok && created.data.id).toBe('evt-16')
  })
})
