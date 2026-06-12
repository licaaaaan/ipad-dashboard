import { describe, it, expect } from 'vitest'
import { parseCalDAVEvents } from './apple-caldav'

describe('parseCalDAVEvents', () => {
  it('parses a basic VCALENDAR response', () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:abc123
SUMMARY:Gym Session
DTSTART:20500101T180000Z
DTEND:20500101T190000Z
END:VEVENT
END:VCALENDAR`

    const events = parseCalDAVEvents(ical)
    expect(events).toHaveLength(1)
    expect(events[0].title).toBe('Gym Session')
    expect(events[0].allDay).toBe(false)
  })

  it('handles all-day events (DATE format)', () => {
    const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:xyz789
SUMMARY:Birthday
DTSTART;VALUE=DATE:20500102
DTEND;VALUE=DATE:20500103
END:VEVENT
END:VCALENDAR`

    const events = parseCalDAVEvents(ical)
    expect(events[0].allDay).toBe(true)
  })
})
