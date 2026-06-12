import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshSpotifyToken, getNowPlaying } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ connected: false })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ connected: false })

  try {
    const refreshed = await refreshSpotifyToken(token)
    const nowPlaying = await getNowPlaying(refreshed.access_token)

    const res = NextResponse.json({ connected: true, nowPlaying })
    if (refreshed.access_token !== token.access_token) {
      res.cookies.set('spotify_token', await encryptToken(refreshed), {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
      })
    }
    return res
  } catch {
    return NextResponse.json({ connected: false, error: 'Spotify unavailable' })
  }
}
