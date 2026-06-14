'use client'
import GlassTile from '@/components/ui/GlassTile'
import GoogleCalendar from '@/components/calendar/GoogleCalendar'

export default function CalendarTile() {
  return (
    <GlassTile gradient="from-green-200 to-cyan-200" className="h-full flex flex-col">
      <p className="text-cyan-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Calendar</p>
      <div className="flex-1 min-h-0 overflow-hidden">
        <GoogleCalendar />
      </div>
    </GlassTile>
  )
}
