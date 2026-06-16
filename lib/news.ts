import { XMLParser } from 'fast-xml-parser'
import type { NewsItem } from '@/types'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'item' || name === 'entry',
})

function sourceFromUrl(feedUrl: string): string {
  try {
    return new URL(feedUrl).hostname
  } catch {
    return feedUrl
  }
}

export async function fetchRssHeadlines(feedUrl: string, limit = 8): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'iPad-Dashboard/1.0' },
    })
    if (!res.ok) return []

    const xml = await res.text()
    const parsed = parser.parse(xml)

    const rssItems: unknown[] = parsed?.rss?.channel?.item ?? []
    const atomItems: unknown[] = parsed?.feed?.entry ?? []
    const rawItems = rssItems.length > 0 ? rssItems : atomItems

    const source = sourceFromUrl(feedUrl)

    return rawItems
      .slice(0, limit)
      .map((raw): NewsItem => {
        const item = raw as Record<string, unknown>
        const title = typeof item.title === 'object'
          ? ((item.title as Record<string, unknown>)['#text'] as string ?? '')
          : (item.title as string ?? '')
        const link = typeof item.link === 'object'
          ? ((item.link as Record<string, unknown>)['@_href'] as string ?? '')
          : (item.link as string ?? '')
        return { title, link, source, pubDate: (item.pubDate ?? item.updated ?? item.published ?? '') as string }
      })
      .filter(item => item.title && item.link)
  } catch {
    return []
  }
}
