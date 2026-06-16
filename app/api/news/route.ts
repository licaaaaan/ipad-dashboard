import { NextRequest, NextResponse } from 'next/server'
import { fetchRssHeadlines } from '@/lib/news'
import { DEFAULT_NEWS_FEEDS } from '@/lib/news-defaults'

export async function GET(req: NextRequest) {
  const feedsParam = req.nextUrl.searchParams.get('feeds')
  const feeds = feedsParam
    ? feedsParam.split('|').map(f => decodeURIComponent(f.trim())).filter(Boolean)
    : DEFAULT_NEWS_FEEDS

  try {
    const results = await Promise.all(feeds.map(url => fetchRssHeadlines(url, 8)))
    const items = results
      .flat()
      .sort((a, b) => (new Date(b.pubDate).getTime() || 0) - (new Date(a.pubDate).getTime() || 0))
      .slice(0, 40)

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[news]', err)
    return NextResponse.json({ items: [] }, { status: 500 })
  }
}
