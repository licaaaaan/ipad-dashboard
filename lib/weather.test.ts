import { describe, it, expect, vi } from 'vitest'
import { fetchWeather } from './weather'

describe('fetchWeather', () => {
  it('returns WeatherData shape on success', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 18.5,
            apparent_temperature: 17,
            weather_code: 2,
          },
          daily: {
            time: ['2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19'],
            weather_code: [2, 1, 3, 0],
            temperature_2m_max: [22, 21, 20, 23],
            temperature_2m_min: [14, 13, 12, 15],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: { city: 'San Francisco' } }),
      }) as unknown as typeof fetch

    const result = await fetchWeather({ lat: 37.77, lon: -122.41 })
    expect(result.city).toBe('San Francisco')
    expect(result.temp).toBe(19)  // rounded from 18.5
    expect(result.forecast).toHaveLength(3)
  })

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch
    await expect(fetchWeather({ lat: 0, lon: 0 })).rejects.toThrow('Open-Meteo error: 401')
  })
})
