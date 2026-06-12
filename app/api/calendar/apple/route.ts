import { NextRequest, NextResponse } from 'next/server'
import { decryptToken } from '@/lib/cookies'
import { fetchAppleCalendarEvents } from '@/lib/apple-caldav'
import type { AppleCredentials } from '@/types'

export async function GET(req: NextRequest) {
  const sealed = req.cookies.get('apple_credentials')?.value
  if (!sealed) return NextResponse.json({ connected: false, events: [] })

  const creds = await decryptToken<AppleCredentials>(sealed)
  if (!creds) return NextResponse.json({ connected: false, events: [] })

  try {
    const events = await fetchAppleCalendarEvents(creds.email, creds.app_password)
    return NextResponse.json({ connected: true, events })
  } catch {
    return NextResponse.json({ connected: false, events: [], error: 'CalDAV fetch failed' })
  }
}
