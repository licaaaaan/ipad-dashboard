import type { WeatherData } from '@/types'

const BASE = 'https://api.open-meteo.com/v1/forecast'

function wmoToCondition(code: number): string {
  if (code === 0) return 'clear sky'
  if (code <= 2) return 'partly cloudy'
  if (code === 3) return 'overcast'
  if (code <= 48) return 'foggy'
  if (code <= 55) return 'drizzle'
  if (code <= 57) return 'freezing drizzle'
  if (code <= 65) return 'rain'
  if (code <= 67) return 'freezing rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'rain showers'
  if (code <= 86) return 'snow showers'
  if (code === 95) return 'thunderstorm'
  return 'thunderstorm with hail'
}

function wmoToEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 2) return '⛅'
  if (code === 3) return '☁️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '🌨️'
  if (code <= 82) return '🌦️'
  if (code <= 86) return '🌨️'
  if (code <= 99) return '⛈️'
  return '🌩️'
}

export async function fetchWeather({ lat, lon }: { lat: number; lon: number }): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: 'temperature_2m,apparent_temperature,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: 'celsius',
    forecast_days: '4',
    timezone: 'auto',
  })

  const res = await fetch(`${BASE}?${params}`)
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

  const data = await res.json()
  const current = data.current
  const daily = data.daily

  // Reverse-geocode city name via Open-Meteo's companion endpoint
  let city = `${lat.toFixed(2)}, ${lon.toFixed(2)}`
  try {
    const geo = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
    )
    if (geo.ok) {
      const g = await geo.json()
      city = g.address?.city ?? g.address?.town ?? g.address?.village ?? g.display_name?.split(',')[0] ?? city
    }
  } catch { /* keep coordinate fallback */ }

  return {
    temp: Math.round(current.temperature_2m),
    feels_like: Math.round(current.apparent_temperature),
    condition: wmoToCondition(current.weather_code),
    icon: wmoToEmoji(current.weather_code),
    city,
    forecast: daily.time.slice(1, 4).map((date: string, i: number) => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      icon: wmoToEmoji(daily.weather_code[i + 1]),
      high: Math.round(daily.temperature_2m_max[i + 1]),
      low: Math.round(daily.temperature_2m_min[i + 1]),
    })),
  }
}
