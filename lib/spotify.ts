import type { OAuthToken, NowPlaying } from '@/types'

export async function refreshSpotifyToken(token: OAuthToken): Promise<OAuthToken> {
  if (Date.now() < token.expires_at - 30_000) return token

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(
        `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token }),
  })

  if (!res.ok) throw new Error('Failed to refresh Spotify token')
  const json = await res.json()
  return {
    access_token: json.access_token,
    refresh_token: token.refresh_token,
    expires_at: Date.now() + json.expires_in * 1000,
  }
}

export async function getNowPlaying(accessToken: string): Promise<NowPlaying | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 204 || res.status === 404) return null
  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`)

  const data = await res.json()
  if (!data?.item) return null

  return {
    isPlaying: data.is_playing,
    trackName: data.item.name,
    artistName: data.item.artists.map((a: { name: string }) => a.name).join(', '),
    albumName: data.item.album.name,
    albumArtUrl: data.item.album.images[0]?.url ?? '',
    progressMs: data.progress_ms,
    durationMs: data.item.duration_ms,
  }
}

export async function controlPlayback(
  accessToken: string,
  action: 'play' | 'pause' | 'next' | 'previous'
): Promise<void> {
  const endpoints: Record<string, { method: string; path: string }> = {
    play:     { method: 'PUT',  path: '/me/player/play' },
    pause:    { method: 'PUT',  path: '/me/player/pause' },
    next:     { method: 'POST', path: '/me/player/next' },
    previous: { method: 'POST', path: '/me/player/previous' },
  }
  const { method, path } = endpoints[action]
  await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
