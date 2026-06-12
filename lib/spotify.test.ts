import { describe, it, expect, vi } from 'vitest'
import { refreshSpotifyToken, getNowPlaying } from './spotify'
import type { OAuthToken } from '@/types'

const makeToken = (expiresInMs: number): OAuthToken => ({
  access_token: 'access',
  refresh_token: 'refresh',
  expires_at: Date.now() + expiresInMs,
})

describe('refreshSpotifyToken', () => {
  it('returns existing token if not expired', async () => {
    const token = makeToken(60_000)
    const result = await refreshSpotifyToken(token)
    expect(result.access_token).toBe('access')
  })

  it('fetches new token when expired', async () => {
    const token = makeToken(-1000)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new_access', expires_in: 3600 }),
    }) as any
    const result = await refreshSpotifyToken(token)
    expect(result.access_token).toBe('new_access')
  })
})

describe('getNowPlaying', () => {
  it('returns null when nothing is playing', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 204 }) as any
    const result = await getNowPlaying('token123')
    expect(result).toBeNull()
  })
})
