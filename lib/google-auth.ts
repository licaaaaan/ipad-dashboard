import { google } from 'googleapis'
import type { OAuthToken } from '@/types'

export async function refreshGoogleToken(token: OAuthToken): Promise<OAuthToken> {
  if (Date.now() < token.expires_at - 60_000) return token

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: token.refresh_token })
  const { credentials } = await auth.refreshAccessToken()

  return {
    access_token: credentials.access_token!,
    refresh_token: token.refresh_token,
    expires_at: credentials.expiry_date ?? Date.now() + 3600_000,
  }
}
