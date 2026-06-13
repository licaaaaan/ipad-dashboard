import { google } from 'googleapis'
import type { CalendarEvent } from '@/types'

function thisWeekRange(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon…
  const daysToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const start = new Date(now)
  start.setDate(now.getDate() + daysToMon)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { timeMin: start.toISOString(), timeMax: end.toISOString() }
}

export async function fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth })
  const { timeMin, timeMax } = thisWeekRange()

  // List all calendars the user has access to
  const calListRes = await calendar.calendarList.list({ minAccessRole: 'reader' })
  const calendars = calListRes.data.items ?? []

  // Fetch this week's events from every calendar in parallel
  const results = await Promise.all(
    calendars.map(async (cal) => {
      try {
        const { data } = await calendar.events.list({
          calendarId: cal.id!,
          timeMin,
          timeMax,
          maxResults: 50,
          singleEvents: true,
          orderBy: 'startTime',
        })
        return (data.items ?? []).map((e): CalendarEvent => ({
          id: `${cal.id}-${e.id}`,
          title: e.summary ?? '(No title)',
          start: e.start?.dateTime ?? e.start?.date ?? '',
          end:   e.end?.dateTime   ?? e.end?.date   ?? '',
          allDay: !e.start?.dateTime,
          calendarName: cal.summary ?? undefined,
        }))
      } catch {
        return []
      }
    })
  )

  return results
    .flat()
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
}
