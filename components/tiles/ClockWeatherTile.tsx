'use client'
import { useEffect, useState, useCallback } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { WeatherData } from '@/types'

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// iOS Safari will hang indefinitely on getCurrentPosition with no options
// (backgrounded tab, Low Power Mode, unanswered prompt) and never fire either
// callback. A timeout guarantees the error path runs so we can fall back.
const GEO_OPTIONS: PositionOptions = {
  timeout: 10_000,
  maximumAge: 5 * 60 * 1000,
}

// Canberra, Australia — used when geolocation is denied or times out.
const FALLBACK_COORDS = { lat: -35.2809, lon: 149.13 }

export default function ClockWeatherTile({ locationOverride }: { locationOverride?: { lat: number; lon: number } }) {
  const [now, setNow] = useState<Date | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherError, setWeatherError] = useState(false)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const load = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (res.ok) {
        setWeather(await res.json())
        setWeatherError(false)
      } else {
        setWeatherError(true)
      }
    } catch {
      setWeatherError(true)
    }
  }, [])

  const loadFromGeo = useCallback(() => {
    setWeatherError(false)
    if (locationOverride) {
      load(locationOverride.lat, locationOverride.lon)
      return
    }
    if (!navigator.geolocation) {
      load(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon),
      GEO_OPTIONS
    )
  }, [load, locationOverride])

  useEffect(() => {
    loadFromGeo()
    const id = setInterval(() => {
      if (locationOverride) {
        load(locationOverride.lat, locationOverride.lon)
        return
      }
      if (!navigator.geolocation) return
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        // Refresh failed — keep the weather already on screen rather than blanking it.
        () => {},
        GEO_OPTIONS
      )
    }, 10 * 60 * 1000)
    return () => clearInterval(id)
  }, [load, loadFromGeo, locationOverride])

  return (
    <GlassTile gradient="from-sky-200 to-indigo-200" className="h-full flex flex-col justify-between">
      {/* Time + Date */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-5xl font-light text-white tabular-nums tracking-tight">
            {now ? formatTime(now) : '--:--'}
          </span>
          {weather && (
            <div className="flex items-center gap-2">
              <span className="text-4xl" role="img" aria-label={weather.condition}>{weather.icon}</span>
              <span className="text-white text-4xl font-light">{weather.temp}°</span>
            </div>
          )}
        </div>

        <p className="text-sky-100/70 text-base font-medium">
          {now ? formatDate(now) : ''}
        </p>

        {weather && (
          <div className="flex flex-col gap-0.5">
            <p className="text-indigo-100/70 text-sm capitalize">{weather.condition}</p>
            <p className="text-indigo-100/90 text-sm font-medium">📍 {weather.city}</p>
          </div>
        )}

        {!weather && weatherError && (
          <button
            onClick={loadFromGeo}
            className="flex items-center gap-1.5 text-white/25 text-xs mt-1 hover:text-white/40 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 8v4l2 2" />
            </svg>
            Weather unavailable — tap to retry
          </button>
        )}
      </div>

      {/* Forecast */}
      {weather && (
        <div className="flex gap-4">
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <span className="text-indigo-200/60 text-xs">{day.date}</span>
              <span className="text-2xl" role="img" aria-label="">{day.icon}</span>
              <span className="text-white text-sm">{day.high}°</span>
              <span className="text-indigo-200/50 text-xs">{day.low}°</span>
            </div>
          ))}
        </div>
      )}
    </GlassTile>
  )
}
