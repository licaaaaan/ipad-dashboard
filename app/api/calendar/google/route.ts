import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshGoogleToken } from '@/lib/google-auth'
import { fetchUpcomingEvents } from '@/lib/google-calendar'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('google_token')?.value
  if (!sealed) return NextResponse.json({ connected: false, events: [] })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ connected: false, events: [] })

  try {
    const refreshed = await refreshGoogleToken(token)
    const events = await fetchUpcomingEvents(refreshed.access_token)

    const res = NextResponse.json({ connected: true, events })
    if (refreshed.access_token !== token.access_token) {
      res.cookies.set('google_token', await encryptToken(refreshed), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
      })
    }
    return res
  } catch (err) {
    console.error('[google-calendar]', err)
    return NextResponse.json({ connected: false, events: [], error: String(err) })
  }
}
