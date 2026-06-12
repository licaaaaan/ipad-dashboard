'use client'
import { useEffect, useState, useCallback } from 'react'
import type { CalendarEvent } from '@/types'

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'All day'
  return new Date(event.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function AppleCalendar() {
  const [state, setState] = useState<{ connected: boolean; events: CalendarEvent[] }>({
    connected: false, events: [],
  })

  const load = useCallback(async () => {
    const res = await fetch('/api/calendar/apple')
    if (res.ok) setState(await res.json())
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [load])

  if (!state.connected) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-white/50 text-xs">Apple Calendar</p>
        <p className="text-white/30 text-xs text-center px-2">Set up in Settings ⚙</p>
      </div>
    )
  }

  if (state.events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white/40 text-xs">No upcoming events</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      <p className="text-rose-200/60 text-xs font-semibold tracking-widest uppercase">Apple</p>
      {state.events.map((event) => (
        <div key={event.id} className="flex gap-2 items-start">
          <span className="text-rose-300 text-xs font-medium w-16 shrink-0 mt-0.5">
            {formatEventTime(event)}
          </span>
          <span className="text-white text-xs truncate">{event.title}</span>
        </div>
      ))}
    </div>
  )
}
