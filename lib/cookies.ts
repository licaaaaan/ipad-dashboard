import { sealData, unsealData } from 'iron-session'

const TTL = 60 * 60 * 24 * 30  // 30 days

export async function encryptToken(data: object): Promise<string> {
  const password = process.env.SESSION_SECRET!
  return sealData(data, { password, ttl: TTL })
}

export async function decryptToken<T>(sealed: string): Promise<T | null> {
  const password = process.env.SESSION_SECRET!
  try {
    const result = await unsealData<T>(sealed, { password, ttl: TTL })
    // iron-session returns an empty object for invalid/unrecognised ciphertext
    // instead of throwing, so treat that as a failure
    if (result !== null && typeof result === 'object' && Object.keys(result as object).length === 0) {
      return null
    }
    return result
  } catch {
    return null
  }
}
