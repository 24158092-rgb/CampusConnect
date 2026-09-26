import { describe, it, expect, beforeEach, vi } from 'vitest'

// The store mutates the seed arrays (pinned on globalThis), so every test
// clears them and loads a fresh copy of the modules.
let eventsMod: typeof import('@/data/events')
let regsMod: typeof import('@/data/registrations')
let store: typeof import('@/data/store')
let auth: typeof import('@/data/auth')
let notes: typeof import('@/data/notifications')

beforeEach(async () => {
  const shared = globalThis as Record<string, unknown>
  delete shared.__campusEvents
  delete shared.__campusRegistrations
  delete shared.__campusIdSeq
  delete shared.__campusUsers
  delete shared.__campusNotifications
  delete shared.__campusAnnouncements
  delete shared.__campusNotificationSeq
  vi.resetModules()
  eventsMod = await import('@/data/events')
  regsMod = await import('@/data/registrations')
  store = await import('@/data/store')
  auth = await import('@/data/auth')
  notes = await import('@/data/notifications')
})

const alertsFor = (id: string) =>
  store.getNotificationStatus(auth.getUserById(id)!).alerts

const student = () => auth.getUserById('stu-1')!
const organizer = () => auth.getUserById('org-1')!
const event = (id: string) => eventsMod.getEventById(id)!

// Registration form values as the browser sends them.
const ADITI = {
  name: 'Aditi Rao',
  rollNumber: '22051001',
  yearOfStudy: '3',
  contactNumber: '9876500001',
  kiitEmail: '22051001@kiit.ac.in',
  personalEmail: 'aditi.rao@gmail.com',
}
const person = (n: number) => ({
  name: `Member ${'ABCDEFGH'[n]}`,
  rollNumber: `2305100${n}`,
  yearOfStudy: '2',
  contactNumber: `912345678${n}`,
  kiitEmail: `2305100${n}@kiit.ac.in`,
  personalEmail: `member${n}@gmail.com`,
})
const solo = { mode: 'individual', members: [ADITI] }
const team = (groupName: string, size: number, leaderIndex = 0) => ({
  mode: 'group',
  groupName,
  memberCount: String(size),
  leaderIndex: String(leaderIndex),
  members: [ADITI, ...[1, 2, 3].map(person)].slice(0, size),
})
const register = (
  user: Parameters<typeof store.registerForEvent>[0],
  eventId: string,
  input: Parameters<typeof store.registerForEvent>[2] = solo,
) => store.registerForEvent(user, eventId, input)

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
    const result = register(student(), 'evt-05')
    expect(result.ok).toBe(true)
    expect(event('evt-05').seatsAvailable).toBe(before - 1)
    expect(regsMod.findActiveRegistration('stu-1', 'evt-05')).toBeDefined()
  })

  it('requires login and a student account', () => {
    expect(register(null, 'evt-05')).toMatchObject({ ok: false })
    expect(register(organizer(), 'evt-05')).toMatchObject({ ok: false })
    expect(event('evt-05').seatsAvailable).toBe(6)
  })

  it('blocks duplicates without touching seats', () => {
    const before = event('evt-01').seatsAvailable
    const result = register(student(), 'evt-01')
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/already registered/) })
    expect(event('evt-01').seatsAvailable).toBe(before)
    expect(regsMod.registrations.filter((r) => r.eventId === 'evt-01')).toHaveLength(1)
  })

  it('blocks full, past, cancelled, and missing events', () => {
    expect(register(student(), 'evt-02')).toMatchObject({ ok: false, error: expect.stringMatching(/full/) })
    expect(register(student(), 'evt-10')).toMatchObject({ ok: false, error: expect.stringMatching(/already taken place/) })
    event('evt-06').cancelled = true
    expect(register(student(), 'evt-06')).toMatchObject({ ok: false, error: expect.stringMatching(/cancelled/) })
    expect(register(student(), 'nope')).toMatchObject({ ok: false })
    expect(event('evt-02').seatsAvailable).toBe(0)
  })

  it('takes the last seat, then reports the event full', () => {
    event('evt-05').seatsAvailable = 1
    expect(register(student(), 'evt-05').ok).toBe(true)
    expect(event('evt-05').seatsAvailable).toBe(0)
    expect(eventsMod.isFullEvent(event('evt-05'))).toBe(true)
  })

  it('re-registering after cancelling reuses the same record', () => {
    register(student(), 'evt-05')
    const reg = regsMod.findActiveRegistration('stu-1', 'evt-05')!
    store.cancelRegistration(student(), reg.id)
    const again = register(student(), 'evt-05')
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

  it('deleting an event removes it but keeps the notice for registered students', () => {
    expect(store.deleteEvent(organizer(), 'evt-01').ok).toBe(true)
    expect(eventsMod.getEventById('evt-01')).toBeUndefined()
    const left = regsMod.registrations.filter((r) => r.eventId === 'evt-01')
    expect(left).toHaveLength(1)
    expect(left[0]).toMatchObject({ status: 'cancelled', cancelledBy: 'organizer' })
    expect(alertsFor('stu-1').map((a) => a.title)).toEqual(['Event cancelled'])
    // ids are not reused after the newest event is deleted
    const org4 = auth.getUserById('org-4')!
    expect(store.deleteEvent(org4, 'evt-15').ok).toBe(true)
    const created = store.createEvent(org4, validInput)
    expect(created.ok && created.data.id).toBe('evt-16')
  })
})

describe('registration form details', () => {
  it('stores an individual registration with the student details', () => {
    const result = register(student(), 'evt-05')
    expect(result.ok).toBe(true)
    const reg = regsMod.findActiveRegistration('stu-1', 'evt-05')!
    expect(reg.mode).toBe('individual')
    expect(reg.members).toEqual([
      {
        ...ADITI,
        yearOfStudy: 3,
        isLeader: true,
      },
    ])
  })

  it('validates every personal field', () => {
    const result = register(student(), 'evt-05', {
      mode: 'individual',
      members: [
        {
          name: 'A1',
          rollNumber: '12ab',
          yearOfStudy: '7',
          contactNumber: '12345',
          kiitEmail: 'aditi@gmail.com',
          personalEmail: 'aditi@kiit.ac.in',
        },
      ],
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(Object.keys(result.fieldErrors!.members![0]).sort()).toEqual(
      ['contactNumber', 'kiitEmail', 'name', 'personalEmail', 'rollNumber', 'yearOfStudy'],
    )
    expect(event('evt-05').seatsAvailable).toBe(6)
  })

  it('accepts +91 and spaces in the phone number and normalizes it', () => {
    const result = register(student(), 'evt-05', {
      mode: 'individual',
      members: [{ ...ADITI, contactNumber: '+91 98765 00001' }],
    })
    expect(result.ok && result.data.members![0].contactNumber).toBe('9876500001')
  })

  it('requires the account holder to be one of the members', () => {
    const result = register(student(), 'evt-05', { mode: 'individual', members: [person(1)] })
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Your own roll number/) })
  })

  it('requires choosing individual or group', () => {
    expect(register(student(), 'evt-05', { members: [ADITI] })).toMatchObject({ ok: false })
  })
})

describe('group registration', () => {
  it('registers a team, takes one seat per member, and records the leader', () => {
    const before = event('evt-05').seatsAvailable
    const result = register(student(), 'evt-05', team('Byte Busters', 3, 1))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toMatchObject({ mode: 'group', groupName: 'Byte Busters' })
    expect(result.data.members!.map((m) => m.isLeader)).toEqual([false, true, false])
    expect(event('evt-05').seatsAvailable).toBe(before - 3)
  })

  it('allows 2 to 4 members only', () => {
    expect(register(student(), 'evt-05', team('Solo Team', 1))).toMatchObject({ ok: false })
    expect(
      register(student(), 'evt-05', { ...team('Big Team', 4), memberCount: '5' }),
    ).toMatchObject({ ok: false, fieldErrors: { memberCount: expect.any(String) } })
    expect(register(student(), 'evt-05', team('Four Of Us', 4)).ok).toBe(true)
  })

  it('requires a valid group name and a team leader', () => {
    expect(register(student(), 'evt-05', team('', 2))).toMatchObject({
      ok: false,
      fieldErrors: { groupName: expect.any(String) },
    })
    expect(register(student(), 'evt-05', team('ab', 2))).toMatchObject({ ok: false })
    expect(register(student(), 'evt-05', team('Team!!', 2))).toMatchObject({ ok: false })
    expect(
      register(student(), 'evt-05', { ...team('Leaderless', 2), leaderIndex: '' }),
    ).toMatchObject({ ok: false, fieldErrors: { leader: expect.any(String) } })
  })

  it('group names must be unique per event, ignoring case', () => {
    expect(register(student(), 'evt-05', team('Byte Busters', 2)).ok).toBe(true)
    const other = store.signUpStudent(person(5))
    expect(other.ok).toBe(true)
    if (!other.ok) return
    const clash = register(other.data, 'evt-05', {
      ...team('  byte   BUSTERS ', 2),
      members: [person(5), person(6)],
    })
    expect(clash).toMatchObject({ ok: false, fieldErrors: { groupName: expect.stringMatching(/already taken/) } })
    expect(store.checkGroupName('evt-05', 'BYTE busters')).toMatch(/already taken/)
    expect(store.checkGroupName('evt-05', 'Fresh Name')).toBeNull()
    // the same name is fine on another event
    expect(store.checkGroupName('evt-06', 'Byte Busters')).toBeNull()
  })

  it('rejects the same person twice in one team', () => {
    const result = register(student(), 'evt-05', {
      ...team('Twins', 2),
      members: [ADITI, { ...person(1), kiitEmail: ADITI.kiitEmail }],
    })
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { members: [undefined, { kiitEmail: expect.stringMatching(/member 1/) }] },
    })
  })

  it('rejects people already registered for the event in another registration', () => {
    expect(register(student(), 'evt-05', team('Alpha', 2)).ok).toBe(true)
    const other = store.signUpStudent(person(5))
    if (!other.ok) throw new Error('sign-up failed')
    // person(1) is already in team Alpha
    const result = register(other.data, 'evt-05', {
      ...team('Beta', 2),
      members: [person(5), person(1)],
    })
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/already registered/) })
  })

  it('needs enough seats for the whole team', () => {
    event('evt-05').seatsAvailable = 2
    const result = register(student(), 'evt-05', team('Too Many', 3))
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/Only 2 seats left/) })
    expect(event('evt-05').seatsAvailable).toBe(2)
  })

  it('cancelling a team gives back every seat, and the team can re-register', () => {
    const before = event('evt-05').seatsAvailable
    const first = register(student(), 'evt-05', team('Alpha', 3))
    if (!first.ok) throw new Error('register failed')
    expect(store.cancelRegistration(student(), first.data.id).ok).toBe(true)
    expect(event('evt-05').seatsAvailable).toBe(before)
    // the freed group name and members can be used again
    const again = register(student(), 'evt-05', team('Alpha', 2))
    expect(again.ok && again.data.id).toBe(first.data.id)
    expect(event('evt-05').seatsAvailable).toBe(before - 2)
  })
})

describe('my registrations: cancelled segment and organizer notices', () => {
  it('lists registrations the student cancelled, with re-register allowed', () => {
    store.cancelRegistration(student(), 'reg-01')
    const { cancelled, upcoming } = store.getStudentRegistrations('stu-1')
    expect(cancelled.map((c) => c.event.id)).toEqual(['evt-01'])
    expect(cancelled[0].canRegisterAgain).toBe(true)
    expect(upcoming.some((u) => u.event.id === 'evt-01')).toBe(false)
    expect(register(student(), 'evt-01').ok).toBe(true)
    expect(store.getStudentRegistrations('stu-1').cancelled).toHaveLength(0)
  })

  it('notifies students when the organizer cancels, and blocks re-registering', () => {
    store.cancelEvent(auth.getUserById('org-3')!, 'evt-09')
    const { cancelledByOrganizer, cancelled } = store.getStudentRegistrations('stu-1')
    expect(cancelled).toHaveLength(0)
    expect(cancelledByOrganizer).toHaveLength(1)
    expect(cancelledByOrganizer[0].notice).toMatch(
      /Startup Pitch Day .* has been cancelled by the organizer.*registration is no longer possible/,
    )
    const alerts = alertsFor('stu-1')
    expect(alerts).toHaveLength(1)
    expect(register(student(), 'evt-09')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/no longer possible/),
    })
    expect(notes.markRead('stu-1', alerts[0].id)).toBe(true)
    expect(alertsFor('stu-1')).toHaveLength(0)
    // dismissing hides the banner but the record stays on My Registrations
    expect(store.getStudentRegistrations('stu-1').cancelledByOrganizer).toHaveLength(1)
  })

  it('only the owner can mark a notification read', () => {
    store.cancelEvent(auth.getUserById('org-3')!, 'evt-09')
    const other = store.signUpStudent(person(5))
    if (!other.ok) throw new Error('sign-up failed')
    const [alert] = alertsFor('stu-1')
    expect(notes.markRead(other.data.id, alert.id)).toBe(false)
    expect(alertsFor('stu-1')).toHaveLength(1)
  })
})

describe('duplicate events', () => {
  it('blocks posting an event with the same name as an upcoming one', () => {
    const result = store.createEvent(organizer(), { ...validInput, name: '  hack THE campus   2026 ' })
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(/already listed/),
      fieldErrors: { name: expect.any(String) },
    })
    expect(eventsMod.events).toHaveLength(15)
  })

  it('checks across organizers and on edit, but allows past or cancelled names', () => {
    // evt-06 "Diwali Mela" belongs to org-2
    expect(store.createEvent(organizer(), { ...validInput, name: 'Diwali Mela' }).ok).toBe(false)
    expect(
      store.updateEvent(organizer(), 'evt-14', { ...validInput, name: 'Diwali Mela' }).ok,
    ).toBe(false)
    // editing an event without renaming it is not a duplicate of itself
    expect(
      store.updateEvent(organizer(), 'evt-14', { ...validInput, name: 'Cloud & DevOps Study Group Kickoff' }).ok,
    ).toBe(true)
    // evt-12 is in the past
    expect(
      store.createEvent(organizer(), { ...validInput, name: 'Data Structures Doubt-Clearing Marathon' }).ok,
    ).toBe(true)
    store.cancelEvent(organizer(), 'evt-01')
    expect(store.createEvent(organizer(), { ...validInput, name: 'Hack the Campus 2026' }).ok).toBe(true)
  })

  it('the seed data has no duplicates', () => {
    const names = store.listUpcomingEvents().map((e) => e.name.toLowerCase())
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('student sign-up', () => {
  it('creates a student account that appears in the user list', () => {
    const result = store.signUpStudent(person(5))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toMatchObject({ id: 'stu-2', role: 'student', name: 'Member F' })
    expect(auth.users.some((u) => u.id === 'stu-2')).toBe(true)
    expect(auth.resolveSessionUser('stu-2')?.profile?.rollNumber).toBe('23051005')
  })

  it.each([
    ['roll number', { rollNumber: ADITI.rollNumber }],
    ['contact number', { contactNumber: '+91 98765 00001' }],
    ['KIIT email', { kiitEmail: '22051001@KIIT.ac.in' }],
  ])('rejects a duplicate %s as "already signed in"', (label, override) => {
    const result = store.signUpStudent({ ...person(5), ...override })
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringMatching(new RegExp(`User already signed in.*${label}.*Aditi Rao`)),
    })
    expect(auth.users.filter((u) => u.role === 'student')).toHaveLength(1)
  })

  it('validates the sign-up fields', () => {
    const result = store.signUpStudent({ ...person(5), personalEmail: 'x@yahoo.com' })
    expect(result).toMatchObject({ ok: false, fieldErrors: { personalEmail: expect.any(String) } })
  })
})

describe('notifications', () => {
  const titles = (id: string) =>
    store.getNotificationsFor(auth.getUserById(id)!).map((n) => `${n.type}: ${n.title}`)

  it('confirms a registration to the student and tells the organizer', () => {
    register(student(), 'evt-05')
    const mine = store.getNotificationsFor(student())
    expect(mine[0]).toMatchObject({ type: 'registration', title: 'Registration confirmed', read: false, eventId: 'evt-05' })
    expect(mine[0].message).toMatch(/You're registered for Intro to Figma Workshop on 10 Oct 2026/)
    // evt-05 belongs to org-2
    expect(titles('org-2')).toEqual(['new-registration: New registration'])
    expect(store.getNotificationsFor(auth.getUserById('org-2')!)[0].message).toMatch(/Aditi Rao registered/)
  })

  it('notifies team members who have their own account', () => {
    const mate = store.signUpStudent(person(1))
    if (!mate.ok) throw new Error('sign-up failed')
    register(student(), 'evt-05', team('Pixel Pals', 2))
    const theirs = store.getNotificationsFor(mate.data)
    expect(theirs).toHaveLength(1)
    expect(theirs[0].message).toMatch(/Aditi Rao added you to team "Pixel Pals"/)
    expect(store.recipientsFor(regsMod.findActiveRegistration('stu-1', 'evt-05')!)).toEqual(['stu-1', mate.data.id])
  })

  it('confirms a cancellation made by the student', () => {
    store.cancelRegistration(student(), 'reg-01')
    expect(titles('stu-1')).toContain('registration-cancelled: Registration cancelled')
  })

  it('sends one automatic reminder for events within a week', () => {
    // TODAY is 16 Sep 2026; evt-03 is on 22 Sep (6 days), evt-01 on 4 Oct.
    expect(store.daysUntil(event('evt-03'))).toBe(6)
    register(student(), 'evt-03')
    const first = store.getNotificationsFor(student()).filter((n) => n.type === 'reminder')
    expect(first).toHaveLength(1)
    expect(first[0].message).toMatch(/Resume & LinkedIn Clinic starts in 6 days/)
    // asking again doesn't send a duplicate, and far-off events get none
    expect(store.sendDueReminders('stu-1')).toBe(0)
    expect(store.getNotificationsFor(student()).filter((n) => n.type === 'reminder')).toHaveLength(1)
  })

  it('no reminders for cancelled registrations, past events or organizers', () => {
    register(student(), 'evt-03')
    const reg = regsMod.findActiveRegistration('stu-1', 'evt-03')!
    store.cancelRegistration(student(), reg.id)
    expect(store.sendDueReminders('stu-1')).toBe(0)
    expect(store.sendDueReminders('org-1')).toBe(0)
  })

  it('tells registered students when the date or venue changes', () => {
    // evt-01 (org-1) has Aditi registered
    const result = store.updateEvent(organizer(), 'evt-01', {
      name: 'Hack the Campus 2026',
      description: 'x',
      date: '2026-10-11T18:00',
      venue: 'Main Auditorium',
      category: 'Tech',
      capacity: '120',
    })
    expect(result).toMatchObject({ ok: true, message: expect.stringMatching(/1 registered person was notified/) })
    const alert = alertsFor('stu-1')[0]
    expect(alert.title).toBe('Event rescheduled')
    expect(alert.message).toMatch(/now on 11 Oct 2026.*was 4 Oct 2026.*now at Main Auditorium \(was Innovation Lab, Block C\)/)
  })

  it('an edit that keeps the date and venue sends nothing', () => {
    store.updateEvent(organizer(), 'evt-01', {
      name: 'Hack the Campus 2026',
      description: 'New description',
      date: '2026-10-04T18:00',
      venue: 'Innovation Lab, Block C',
      category: 'Tech',
      capacity: '120',
    })
    expect(alertsFor('stu-1')).toHaveLength(0)
  })

  it('organizer announcements reach everyone registered', () => {
    const mate = store.signUpStudent(person(1))
    if (!mate.ok) throw new Error('sign-up failed')
    register(student(), 'evt-14', team('Cloud Nine', 2))
    const result = store.postAnnouncement(organizer(), 'evt-14', '  Bring your laptop charger.  ')
    expect(result).toMatchObject({ ok: true, data: { notified: 2 } })
    for (const id of ['stu-1', mate.data.id]) {
      expect(store.getNotificationsFor(auth.getUserById(id)!)[0]).toMatchObject({
        type: 'announcement',
        message: 'Bring your laptop charger.',
      })
    }
    expect(notes.listAnnouncements('evt-14').map((a) => a.message)).toEqual(['Bring your laptop charger.'])
  })

  it('announcements are validated and limited to the owner', () => {
    expect(store.postAnnouncement(organizer(), 'evt-14', 'hi')).toMatchObject({ ok: false, fieldErrors: { message: expect.any(String) } })
    expect(store.postAnnouncement(organizer(), 'evt-14', 'x'.repeat(501))).toMatchObject({ ok: false })
    expect(store.postAnnouncement(organizer(), 'evt-02', 'Not my event')).toMatchObject({ ok: false })
    expect(store.postAnnouncement(student(), 'evt-14', 'Students cannot post')).toMatchObject({ ok: false })
    expect(store.postAnnouncement(organizer(), 'evt-12', 'Past event')).toMatchObject({ ok: false })
    expect(notes.announcements).toHaveLength(0)
  })

  it('unread count and mark all as read', () => {
    register(student(), 'evt-05')
    store.cancelRegistration(student(), regsMod.findActiveRegistration('stu-1', 'evt-05')!.id)
    expect(store.getNotificationStatus(student()).unread).toBe(2)
    expect(notes.markAllRead('stu-1')).toBe(2)
    expect(store.getNotificationStatus(student()).unread).toBe(0)
    expect(store.getNotificationStatus(null)).toEqual({ unread: 0, alerts: [] })
  })
})
