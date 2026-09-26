// Personal details collected at sign-up and for every member of an event
// registration, with the validation both forms share.

export interface PersonDetails {
  name: string
  rollNumber: string
  yearOfStudy: number
  contactNumber: string // 10-digit Indian mobile number, no prefix
  kiitEmail: string
  personalEmail: string
}

export type PersonField = keyof PersonDetails
export type PersonErrors = Partial<Record<PersonField, string>>

export const PERSON_FIELDS: PersonField[] = [
  'name',
  'rollNumber',
  'yearOfStudy',
  'contactNumber',
  'kiitEmail',
  'personalEmail',
]

export const PERSON_LABELS: Record<PersonField, string> = {
  name: 'Full name',
  rollNumber: 'Roll number',
  yearOfStudy: 'Year of study',
  contactNumber: 'Contact number',
  kiitEmail: 'KIIT email',
  personalEmail: 'Personal Gmail',
}

export const YEARS_OF_STUDY = [1, 2, 3, 4, 5] as const

const NAME_PATTERN = /^[A-Za-z][A-Za-z .'-]*$/
const ROLL_PATTERN = /^\d{7,10}$/
const PHONE_PATTERN = /^[6-9]\d{9}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Strips spaces, dashes and a leading +91 / 0 from a phone number. */
export function normalizePhone(value: string): string {
  let digits = value.replace(/[\s-]/g, '')
  if (digits.startsWith('+91')) digits = digits.slice(3)
  else if (digits.length === 11 && digits.startsWith('0'))
    digits = digits.slice(1)
  return digits
}

export function validatePerson(
  raw: Partial<Record<PersonField, unknown>>,
): { ok: true; value: PersonDetails } | { ok: false; errors: PersonErrors } {
  const errors: PersonErrors = {}

  const name = text(raw.name).replace(/\s+/g, ' ')
  if (!name) errors.name = 'Enter the full name.'
  else if (name.length < 2 || name.length > 60) {
    errors.name = 'Name must be 2–60 characters.'
  } else if (!NAME_PATTERN.test(name)) {
    errors.name = 'Use letters, spaces, dots, hyphens or apostrophes only.'
  }

  const rollNumber = text(raw.rollNumber)
  if (!rollNumber) errors.rollNumber = 'Enter the roll number.'
  else if (!ROLL_PATTERN.test(rollNumber)) {
    errors.rollNumber = 'Roll number must be 7–10 digits.'
  }

  const yearText =
    typeof raw.yearOfStudy === 'number'
      ? String(raw.yearOfStudy)
      : text(raw.yearOfStudy)
  const yearOfStudy = Number(yearText)
  if (!yearText) errors.yearOfStudy = 'Pick the year of study.'
  else if (!(YEARS_OF_STUDY as readonly number[]).includes(yearOfStudy)) {
    errors.yearOfStudy = 'Year of study must be between 1 and 5.'
  }

  const contactNumber = normalizePhone(text(raw.contactNumber))
  if (!contactNumber) errors.contactNumber = 'Enter a contact number.'
  else if (!PHONE_PATTERN.test(contactNumber)) {
    errors.contactNumber = 'Enter a valid 10-digit mobile number.'
  }

  const kiitEmail = text(raw.kiitEmail).toLowerCase()
  if (!kiitEmail) errors.kiitEmail = 'Enter the KIIT email.'
  else if (
    !EMAIL_PATTERN.test(kiitEmail) ||
    !kiitEmail.endsWith('@kiit.ac.in')
  ) {
    errors.kiitEmail = 'Use a KIIT email ending in @kiit.ac.in.'
  }

  const personalEmail = text(raw.personalEmail).toLowerCase()
  if (!personalEmail) errors.personalEmail = 'Enter a personal Gmail address.'
  else if (
    !EMAIL_PATTERN.test(personalEmail) ||
    !personalEmail.endsWith('@gmail.com')
  ) {
    errors.personalEmail = 'Use a personal Gmail address ending in @gmail.com.'
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      name,
      rollNumber,
      yearOfStudy,
      contactNumber,
      kiitEmail,
      personalEmail,
    },
  }
}

/** The fields that identify a person: no two people may share any of them. */
export const IDENTITY_FIELDS = [
  'rollNumber',
  'contactNumber',
  'kiitEmail',
] as const
export type IdentityField = (typeof IDENTITY_FIELDS)[number]

/** The first identity field `a` and `b` share, if any. */
export function sharedIdentity(
  a: Pick<PersonDetails, IdentityField>,
  b: Pick<PersonDetails, IdentityField>,
): IdentityField | null {
  return IDENTITY_FIELDS.find((field) => a[field] === b[field]) ?? null
}

export const IDENTITY_LABELS: Record<IdentityField, string> = {
  rollNumber: 'roll number',
  contactNumber: 'contact number',
  kiitEmail: 'KIIT email',
}
