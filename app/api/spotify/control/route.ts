import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshSpotifyToken, controlPlayback } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function POST(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { action } = await req.json() as { action: 'play' | 'pause' | 'next' | 'previous' }
  const refreshed = await refreshSpotifyToken(token)
  await controlPlayback(refreshed.access_token, action)

  const res = NextResponse.json({ ok: true })
  if (refreshed.access_token !== token.access_token) {
    res.cookies.set('spotify_token', await encryptToken(refreshed), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/',
    })
  }
  return res
}
