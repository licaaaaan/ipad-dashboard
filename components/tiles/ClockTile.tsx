'use client'
import { useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ClockTile() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <GlassTile gradient="from-amber-400 to-amber-600" className="h-full flex flex-col justify-center items-center gap-2">
      <span className="text-4xl font-light text-white tabular-nums tracking-tight">
        {now ? formatTime(now) : '--:--:--'}
      </span>
      <span className="text-sm text-amber-100/80 font-medium">
        {now ? formatDate(now) : ''}
      </span>
    </GlassTile>
  )
}
