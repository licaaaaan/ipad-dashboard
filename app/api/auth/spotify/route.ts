import { NextResponse } from 'next/server'

const SCOPES = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ')

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
    scope: SCOPES,
  })
  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}
