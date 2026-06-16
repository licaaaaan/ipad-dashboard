'use client'
import { useEffect, useState } from 'react'
import GlassTile from '@/components/ui/GlassTile'
import type { NewsItem } from '@/types'
import { DEFAULT_NEWS_FEEDS } from '@/lib/news-defaults'

function getFeeds(): string[] {
  try {
    const stored = localStorage.getItem('news_feeds')
    if (stored) {
      const parsed = JSON.parse(stored) as string[]
      return parsed.length > 0 ? parsed : DEFAULT_NEWS_FEEDS
    }
  } catch {}
  return DEFAULT_NEWS_FEEDS
}

export default function NewsTile() {
  const [items, setItems] = useState<NewsItem[]>([])

  useEffect(() => {
    async function load() {
      try {
        const feeds = getFeeds()
        const params = feeds.map(f => encodeURIComponent(f)).join(',')
        const res = await fetch(`/api/news?feeds=${params}`)
        if (res.ok) {
          const data = await res.json()
          setItems(data.items)
        }
      } catch {}
    }
    load()
    const id = setInterval(load, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <GlassTile gradient="from-emerald-200 to-teal-200" className="h-full flex flex-col">
      <p className="text-emerald-200/70 text-xs font-semibold tracking-widest uppercase mb-2 shrink-0">
        News
      </p>
      <div className="flex gap-3 overflow-x-auto no-scrollbar flex-1 items-stretch">
        {items.length === 0 && (
          <p className="text-white/40 text-sm self-center">Loading headlines...</p>
        )}
        {items.map((item) => (
          <a
            key={item.link}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-48 bg-white/5 hover:bg-white/10 border border-white/10
              rounded-xl p-3 flex flex-col gap-1 transition-colors"
          >
            <p className="text-white text-sm font-medium leading-snug line-clamp-3 flex-1">
              {item.title}
            </p>
            <p className="text-emerald-200/60 text-xs">{item.source}</p>
          </a>
        ))}
      </div>
    </GlassTile>
  )
}
