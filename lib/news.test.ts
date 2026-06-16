import { describe, it, expect, vi, beforeEach } from 'vitest'

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>First headline</title>
      <link>https://example.com/1</link>
      <pubDate>Mon, 16 Jun 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Second headline</title>
      <link>https://example.com/2</link>
      <pubDate>Mon, 16 Jun 2026 09:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`

describe('fetchRssHeadlines', () => {
  beforeEach(() => vi.resetModules())

  it('parses RSS items into NewsItem shape', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(RSS_XML),
    } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://feeds.bbci.co.uk/news/rss.xml')

    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('First headline')
    expect(result[0].link).toBe('https://example.com/1')
    expect(result[0].source).toBe('feeds.bbci.co.uk')
    expect(result[0].pubDate).toBe('Mon, 16 Jun 2026 10:00:00 GMT')
  })

  it('returns empty array when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://bad.example.com/rss')
    expect(result).toHaveLength(0)
  })

  it('respects the limit parameter', async () => {
    const manyItems = Array.from({ length: 20 }, (_, i) =>
      `<item><title>Headline ${i}</title><link>https://example.com/${i}</link></item>`
    ).join('')
    const bigXml = `<rss version="2.0"><channel>${manyItems}</channel></rss>`
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(bigXml),
    } as unknown as Response)

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://example.com/rss', 5)
    expect(result).toHaveLength(5)
  })

  it('returns empty array when fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    const { fetchRssHeadlines } = await import('./news')
    const result = await fetchRssHeadlines('https://example.com/rss')
    expect(result).toHaveLength(0)
  })
})
