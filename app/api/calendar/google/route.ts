import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { fetchUpcomingEvents } from '@/lib/google-calendar'
import { google } from 'googleapis'
import type { OAuthToken } from '@/types'

async function refreshGoogleToken(token: OAuthToken): Promise<OAuthToken> {
  if (Date.now() < token.expires_at - 60_000) return token

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: token.refresh_token })
  const { credentials } = await auth.refreshAccessToken()

  return {
    access_token: credentials.access_token!,
    refresh_token: token.refresh_token,
    expires_at: credentials.expiry_date ?? Date.now() + 3600_000,
  }
}

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
  } catch {
    return NextResponse.json({ connected: false, events: [], error: 'Google Calendar unavailable' })
  }
}
