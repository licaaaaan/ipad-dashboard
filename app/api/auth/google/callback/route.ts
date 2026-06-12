import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { encryptToken } from '@/lib/cookies'
import type { OAuthToken } from '@/types'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_error=1`)

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  try {
    const { tokens } = await auth.getToken(code)
    if (!tokens.access_token) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_error=1`)

    const token: OAuthToken = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? '',
      expires_at: tokens.expiry_date ?? Date.now() + 3600_000,
    }

    const sealed = await encryptToken(token)
    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_connected=1`)
    response.cookies.set('google_token', sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
    return response
  } catch {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}?google_error=1`)
  }
}
