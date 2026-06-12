import { google } from 'googleapis'
import type { CalendarEvent } from '@/types'

export async function fetchUpcomingEvents(accessToken: string): Promise<CalendarEvent[]> {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth })
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 5,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (data.items ?? []).map((e) => ({
    id: e.id ?? '',
    title: e.summary ?? '(No title)',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end:   e.end?.dateTime ?? e.end?.date ?? '',
    allDay: !e.start?.dateTime,
  }))
}
