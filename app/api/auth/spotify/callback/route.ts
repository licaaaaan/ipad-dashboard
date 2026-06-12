import { NextRequest, NextResponse } from 'next/server'
import { encryptToken } from '@/lib/cookies'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_error=1`)

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
  })

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body,
  })

  if (!res.ok) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_error=1`)

  const json = await res.json()
  const token: OAuthToken = {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  }

  const sealed = await encryptToken(token)
  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?spotify_connected=1`)
  response.cookies.set('spotify_token', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
