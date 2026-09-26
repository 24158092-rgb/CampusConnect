import { headers } from 'next/headers'

/** This site's origin, e.g. "https://campus-connect.vercel.app". Server only. */
export function getSiteUrl(): string {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
