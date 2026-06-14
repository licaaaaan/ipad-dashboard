'use client'
import { useEffect, useState, useCallback } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { WeatherData } from '@/types'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function ClockWeatherTile({ locationOverride }: { locationOverride?: { lat: number; lon: number } }) {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (res.ok) setWeather(await res.json())
    } catch { /* silent — weather is supplementary */ }
  }, [])

  useEffect(() => {
    if (locationOverride) {
      load(locationOverride.lat, locationOverride.lon)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(37.7749, -122.4194)
    )
    const id = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => {}
      )
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [load, locationOverride])

  return (
    <GlassTile gradient="from-sky-200 to-indigo-200" className="h-full flex flex-col justify-between">
      {/* Time + Date */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-7xl font-light text-white tabular-nums tracking-tight">
            {now ? formatTime(now) : '--:--:--'}
          </span>
          <p className="text-sky-100/70 text-xl font-medium mt-2">
            {now ? formatDate(now) : ''}
          </p>
        </div>

        {/* Current weather */}
        {weather && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <span className="text-white text-6xl font-light">{weather.temp}°</span>
              <span className="text-6xl" role="img" aria-label={weather.condition}>{weather.icon}</span>
            </div>
            <p className="text-indigo-100/70 text-lg capitalize text-right">{weather.condition}</p>
            <p className="text-indigo-100/90 text-xl text-right font-medium">📍 {weather.city}</p>
          </div>
        )}
      </div>

      {/* Forecast */}
      {weather && (
        <div className="flex gap-6">
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-1">
              <span className="text-indigo-200/60 text-lg">{day.date}</span>
              <span className="text-3xl" role="img" aria-label="">{day.icon}</span>
              <span className="text-white text-lg">{day.high}°</span>
              <span className="text-indigo-200/50 text-base">{day.low}°</span>
            </div>
          ))}
        </div>
      )}
    </GlassTile>
  )
}
