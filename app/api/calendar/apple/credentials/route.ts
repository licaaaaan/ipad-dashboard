import { NextRequest, NextResponse } from 'next/server'
import { encryptToken } from '@/lib/cookies'
import { fetchAppleCalendarEvents } from '@/lib/apple-caldav'
import type { AppleCredentials } from '@/types'

export async function POST(req: NextRequest) {
  const { email, app_password } = await req.json() as AppleCredentials

  if (!email || !app_password) {
    return NextResponse.json({ error: 'email and app_password required' }, { status: 400 })
  }

  try {
    await fetchAppleCalendarEvents(email, app_password)
  } catch {
    return NextResponse.json({ error: 'Invalid credentials or CalDAV unavailable' }, { status: 401 })
  }

  const sealed = await encryptToken({ email, app_password } as AppleCredentials)
  const response = NextResponse.json({ ok: true })
  response.cookies.set('apple_credentials', sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return response
}
