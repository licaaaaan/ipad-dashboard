import { NextRequest, NextResponse } from 'next/server'
import { decryptToken } from '@/lib/cookies'
import { refreshSpotifyToken } from '@/lib/spotify'
import type { OAuthToken } from '@/types'

export async function POST(req: NextRequest) {
  const sealed = req.cookies.get('spotify_token')?.value
  if (!sealed) return NextResponse.json({ error: 'Not connected' }, { status: 401 })

  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { deviceId } = await req.json()
  const refreshed = await refreshSpotifyToken(token)

  const res = await fetch('https://api.spotify.com/v1/me/player', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshed.access_token}`,
    },
    body: JSON.stringify({ device_ids: [deviceId], play: true }),
  })

  if (!res.ok && res.status !== 204) {
    return NextResponse.json({ error: `Transfer failed: ${res.status}` }, { status: res.status })
  }

  return NextResponse.json({ ok: true })
}
