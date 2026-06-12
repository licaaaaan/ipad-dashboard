'use client'
import { useEffect, useState, useCallback } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { WeatherData } from '@/types'

const WEATHER_ICON_URL = (icon: string) => `https://openweathermap.org/img/wn/${icon}@2x.png`

export default function WeatherTile({ locationOverride }: { locationOverride?: { lat: number; lon: number } }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [error, setError] = useState(false)

  const load = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      if (!res.ok) throw new Error()
      setWeather(await res.json())
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    if (locationOverride) {
      load(locationOverride.lat, locationOverride.lon)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => load(pos.coords.latitude, pos.coords.longitude),
      () => load(37.7749, -122.4194)  // fallback: San Francisco
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
    <GlassTile gradient="from-purple-700 to-cyan-500" className="h-full flex flex-col justify-between">
      {error ? (
        <p className="text-white/60 text-sm">Weather unavailable</p>
      ) : !weather ? (
        <p className="text-white/40 text-sm animate-pulse">Loading weather...</p>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-purple-200/70 text-xs font-semibold tracking-widest uppercase">Weather</p>
              <p className="text-white text-5xl font-light mt-1">{weather.temp}°</p>
              <p className="text-purple-100/80 text-sm capitalize mt-1">{weather.condition}</p>
              <p className="text-purple-200/60 text-xs mt-0.5">{weather.city}</p>
            </div>
            <img src={WEATHER_ICON_URL(weather.icon)} alt={weather.condition} className="w-16 h-16" />
          </div>
          <div className="flex gap-4 mt-3">
            {weather.forecast.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <span className="text-purple-200/60 text-xs">{day.date}</span>
                <img src={WEATHER_ICON_URL(day.icon)} alt="" className="w-8 h-8" />
                <span className="text-white text-xs">{day.high}°</span>
                <span className="text-purple-200/50 text-xs">{day.low}°</span>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassTile>
  )
}
