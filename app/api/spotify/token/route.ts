import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshSpotifyToken } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const refreshed = await refreshSpotifyToken(token)
    const res = NextResponse.json({ access_token: refreshed.access_token })
    if (refreshed.access_token !== token.access_token) {
      res.cookies.set('spotify_token', await encryptToken(refreshed), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
      })
    }
    return res
  } catch {
    return NextResponse.json({ error: 'Token refresh failed' }, { status: 500 })
  }
}
