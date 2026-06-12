import type { CalendarEvent } from '@/types'

export function parseCalDAVEvents(icalText: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const veventBlocks = icalText.split('BEGIN:VEVENT').slice(1)

  for (const block of veventBlocks) {
    const get = (key: string) => {
      const match = block.match(new RegExp(`^${key}[^:]*:(.+)`, 'm'))
      return match?.[1]?.trim() ?? ''
    }

    const uid = get('UID')
    const summary = get('SUMMARY') || '(No title)'
    const dtstart = get('DTSTART')
    const dtend = get('DTEND')
    const allDay = dtstart.length === 8  // DATE format: YYYYMMDD

    // Convert YYYYMMDD to YYYY-MM-DD so new Date() can parse all-day dates correctly
    const toDateStr = (raw: string) =>
      raw.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3')

    events.push({
      id: uid,
      title: summary,
      start: allDay
        ? toDateStr(dtstart)
        : new Date(
            dtstart.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')
          ).toISOString(),
      end: allDay
        ? toDateStr(dtend)
        : new Date(
            dtend.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?/, '$1-$2-$3T$4:$5:$6Z')
          ).toISOString(),
      allDay,
    })
  }

  const now = new Date()
  return events
    .filter(e => new Date(e.start) >= now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5)
}

export async function fetchAppleCalendarEvents(
  email: string,
  appPassword: string
): Promise<CalendarEvent[]> {
  const auth = Buffer.from(`${email}:${appPassword}`).toString('base64')
  const now = new Date()
  const later = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const nowStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const laterStr = later.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><D:getetag/><C:calendar-data/></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${nowStr}" end="${laterStr}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

  const res = await fetch('https://caldav.icloud.com/', {
    method: 'REPORT',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/xml',
      Depth: '1',
    },
    body,
  })

  if (!res.ok) throw new Error(`CalDAV error: ${res.status}`)
  const text = await res.text()

  const icalBlocks = Array.from(text.matchAll(/<cal:calendar-data[^>]*>([\s\S]*?)<\/cal:calendar-data>/g))
    .map(m => m[1])
    .join('\n')

  return parseCalDAVEvents(icalBlocks)
}
