import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('fetchUpcomingEvents', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('maps Google API response to CalendarEvent shape', async () => {
    const mockEvents = {
      items: [
        {
          id: '1',
          summary: 'Team Standup',
          start: { dateTime: '2026-06-12T11:00:00Z' },
          end:   { dateTime: '2026-06-12T11:30:00Z' },
        },
        {
          id: '2',
          summary: 'All Day Event',
          start: { date: '2026-06-13' },
          end:   { date: '2026-06-14' },
        },
      ],
    }

    const mockEventsList = vi.fn().mockResolvedValue({ data: mockEvents })
    const mockCalListList = vi.fn().mockResolvedValue({
      data: { items: [{ id: 'primary', summary: 'My Calendar' }] },
    })

    vi.doMock('googleapis', () => ({
      google: {
        auth: {
          OAuth2: class {
            setCredentials() {}
          },
        },
        calendar: vi.fn().mockReturnValue({
          calendarList: { list: mockCalListList },
          events: { list: mockEventsList },
        }),
      },
    }))

    const { fetchUpcomingEvents } = await import('./google-calendar')
    const result = await fetchUpcomingEvents('access_token_123')
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Team Standup')
    expect(result[0].allDay).toBe(false)
    expect(result[1].title).toBe('All Day Event')
    expect(result[1].allDay).toBe(true)
  })
})
