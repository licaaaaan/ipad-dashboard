import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error(`Bing API responded ${res.status}`)

    const data = await res.json()
    const image = data.images?.[0]
    if (!image) throw new Error('No image in Bing response')

    return NextResponse.json(
      { url: `https://www.bing.com${image.url}`, title: image.copyright ?? '' },
      { headers: { 'Cache-Control': 'public, max-age=3600' } }
    )
  } catch (err) {
    console.error('[bing-photo]', err)
    return NextResponse.json({ url: '', title: '' }, { status: 500 })
  }
}
