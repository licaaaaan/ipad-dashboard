import { describe, it, expect, vi } from 'vitest'
import { fetchWeather } from './weather'

describe('fetchWeather', () => {
  it('returns WeatherData shape on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        name: 'San Francisco',
        main: { temp: 18.5, feels_like: 17 },
        weather: [{ description: 'partly cloudy', icon: '02d' }],
      }),
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        list: Array.from({ length: 17 }, (_, i) => ({
          dt: 1700000000 + i * 10800,
          main: { temp_max: 20 + i, temp_min: 14 + i },
          weather: [{ icon: '02d' }],
        })),
      }),
    }) as unknown as typeof fetch

    const result = await fetchWeather({ lat: 37.77, lon: -122.41 })
    expect(result.city).toBe('San Francisco')
    expect(result.temp).toBe(19)  // rounded from 18.5
    expect(result.forecast).toHaveLength(3)
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch
    await expect(fetchWeather({ lat: 0, lon: 0 })).rejects.toThrow('OpenWeatherMap error: 401')
  })
})
