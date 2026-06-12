import { describe, it, expect, beforeAll } from 'vitest'
import { encryptToken, decryptToken } from './cookies'

beforeAll(() => {
  process.env.SESSION_SECRET = 'test-secret-32-chars-padding-xxx!'
})

describe('cookie encryption', () => {
  it('round-trips a token object', async () => {
    const token = { access_token: 'abc123', refresh_token: 'def456', expires_at: 9999999999 }
    const encrypted = await encryptToken(token)
    const decrypted = await decryptToken(encrypted)
    expect(decrypted).toEqual(token)
  })

  it('returns null for invalid ciphertext', async () => {
    const result = await decryptToken('not-valid-ciphertext')
    expect(result).toBeNull()
  })
})
