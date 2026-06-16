import { NextRequest, NextResponse } from 'next/server'
import { decryptToken, encryptToken } from '@/lib/cookies'
import { refreshGoogleToken } from '@/lib/google-auth'
import { fetchTaskLists, completeTask } from '@/lib/google-tasks'
import type { OAuthToken } from '@/types'

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

async function getRefreshedToken(req: NextRequest): Promise<{ token: OAuthToken; refreshed: OAuthToken } | null> {
  const sealed = req.cookies.get('google_token')?.value
  if (!sealed) return null
  const token = await decryptToken<OAuthToken>(sealed)
  if (!token) return null
  const refreshed = await refreshGoogleToken(token)
  return { token, refreshed }
}

async function maybeSetCookie(res: NextResponse, token: OAuthToken, refreshed: OAuthToken): Promise<void> {
  if (refreshed.access_token !== token.access_token) {
    const sealed = await encryptToken(refreshed)
    res.cookies.set('google_token', sealed, COOKIE_OPTS)
  }
}

export async function GET(req: NextRequest) {
  const pair = await getRefreshedToken(req)
  if (!pair) return NextResponse.json({ connected: false, taskLists: [] })

  try {
    const taskLists = await fetchTaskLists(pair.refreshed.access_token)
    const res = NextResponse.json({ connected: true, taskLists })
    await maybeSetCookie(res, pair.token, pair.refreshed)
    return res
  } catch (err) {
    console.error('[google-tasks GET]', err)
    return NextResponse.json({ connected: false, taskLists: [] })
  }
}

export async function PATCH(req: NextRequest) {
  const pair = await getRefreshedToken(req)
  if (!pair) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const { taskListId, taskId } = body ?? {}
  if (!taskListId || !taskId) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    await completeTask(pair.refreshed.access_token, taskListId, taskId)
    const res = NextResponse.json({ ok: true })
    await maybeSetCookie(res, pair.token, pair.refreshed)
    return res
  } catch (err) {
    console.error('[google-tasks PATCH]', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
