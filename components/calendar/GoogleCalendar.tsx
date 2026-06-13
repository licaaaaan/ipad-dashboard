'use client'
import { useEffect, useState, useCallback } from 'react'
import type { CalendarEvent } from '@/types'

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function dayKey(dateStr: string): string {
  return dateStr.slice(0, 10)
}

function formatTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function groupByDay(events: CalendarEvent[]): { key: string; label: string; events: CalendarEvent[] }[] {
  const map = new Map<string, CalendarEvent[]>()
  for (const e of events) {
    const k = dayKey(e.start)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(e)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, evts]) => ({
      key,
      label: dayLabel(evts[0].start),
      events: evts,
    }))
}

export default function GoogleCalendar() {
  const [state, setState] = useState<{ connected: boolean; events: CalendarEvent[] }>({
    connected: false, events: [],
  })

  const load = useCallback(async () => {
    const res = await fetch('/api/calendar/google')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (!state.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-white/50 text-xl">Google Calendar</p>
        <a href="/api/auth/google"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-lg font-semibold rounded-full transition-colors">
          Connect Google
        </a>
      </div>
    )
  }

  const groups = groupByDay(state.events)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col h-full gap-1">
        <p className="text-emerald-200/60 text-lg font-semibold tracking-widest uppercase mb-1">This Week</p>
        <div className="flex items-center justify-center flex-1">
          <p className="text-white/40 text-xl">No events this week</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto no-scrollbar">
      <p className="text-emerald-200/60 text-lg font-semibold tracking-widest uppercase shrink-0">This Week</p>
      {groups.map(group => (
        <div key={group.key} className="shrink-0">
          <p className="text-emerald-300/80 text-lg font-semibold mb-1.5">{group.label}</p>
          <div className="flex flex-col gap-1.5 pl-1">
            {group.events.map(event => (
              <div key={event.id} className="flex gap-3 items-baseline">
                <span className="text-white/50 text-base shrink-0 w-20">{formatTime(event)}</span>
                <span className="text-white text-base truncate flex-1">{event.title}</span>
                {event.calendarName && (
                  <span className="text-white/30 text-sm shrink-0 truncate max-w-[80px]">{event.calendarName}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
