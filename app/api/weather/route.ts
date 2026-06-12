import { NextRequest, NextResponse } from 'next/server'
import { fetchWeather } from '@/lib/weather'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '0')
  const lon = parseFloat(searchParams.get('lon') ?? '0')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
  }

  try {
    const data = await fetchWeather({ lat, lon })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=600' },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
