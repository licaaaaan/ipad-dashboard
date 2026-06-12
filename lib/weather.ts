import type { WeatherData } from '@/types'

const BASE = 'https://api.openweathermap.org/data/2.5'

export async function fetchWeather({ lat, lon }: { lat: number; lon: number }): Promise<WeatherData> {
  const key = process.env.OPENWEATHER_API_KEY
  const [current, forecast] = await Promise.all([
    fetch(`${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`),
    fetch(`${BASE}/forecast?lat=${lat}&lon=${lon}&units=metric&cnt=24&appid=${key}`),
  ])

  if (!current.ok) throw new Error(`OpenWeatherMap error: ${current.status}`)
  if (!forecast.ok) throw new Error(`OpenWeatherMap error: ${forecast.status}`)

  const c = await current.json()
  const f = await forecast.json()

  interface ForecastEntry {
    dt: number
    main: { temp_max: number; temp_min: number }
    weather: Array<{ icon: string }>
  }

  // One entry per day: pick noon-ish entries (every 8th = every 24h at 3h intervals)
  const days: ForecastEntry[] = (f.list as ForecastEntry[]).filter((_: unknown, i: number) => i % 8 === 0).slice(0, 3)

  return {
    temp: Math.round(c.main.temp),
    feels_like: Math.round(c.main.feels_like),
    condition: c.weather[0].description,
    icon: c.weather[0].icon,
    city: c.name,
    forecast: days.map((d) => ({
      date: new Date(d.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
      icon: d.weather[0].icon,
      high: Math.round(d.main.temp_max),
      low: Math.round(d.main.temp_min),
    })),
  }
}
