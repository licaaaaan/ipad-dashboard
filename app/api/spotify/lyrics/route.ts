import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams({
    artist_name: searchParams.get('artist') ?? '',
    track_name:  searchParams.get('title')  ?? '',
    album_name:  searchParams.get('album')  ?? '',
    duration:    searchParams.get('duration') ?? '',
  })

  try {
    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { 'User-Agent': 'iPad-Dashboard/1.0 (https://i-pad-dashbooard.vercel.app)' },
    })
    if (!res.ok) return NextResponse.json({ syncedLyrics: null, plainLyrics: null })
    const data = await res.json()
    return NextResponse.json({
      syncedLyrics: data.syncedLyrics ?? null,
      plainLyrics:  data.plainLyrics  ?? null,
    })
  } catch {
    return NextResponse.json({ syncedLyrics: null, plainLyrics: null })
  }
}
