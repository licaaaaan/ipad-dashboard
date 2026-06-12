'use client'
import GlassTile from '@/components/ui/GlassTile'
import SwipeContainer from '@/components/ui/SwipeContainer'
import GoogleCalendar from '@/components/calendar/GoogleCalendar'
import AppleCalendar from '@/components/calendar/AppleCalendar'

export default function CalendarTile() {
  return (
    <GlassTile gradient="from-emerald-500 to-teal-600" className="h-full flex flex-col">
      <p className="text-emerald-200/70 text-xs font-semibold tracking-widest uppercase mb-2">Calendar</p>
      <div className="flex-1 min-h-0">
        <SwipeContainer className="h-full">
          <GoogleCalendar />
          <AppleCalendar />
        </SwipeContainer>
      </div>
    </GlassTile>
  )
}
