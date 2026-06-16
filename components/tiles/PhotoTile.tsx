'use client'
import { useEffect, useState } from 'react'
import type { BingPhoto } from '@/types'

export default function PhotoTile() {
  const [photo, setPhoto] = useState<BingPhoto | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/photo/bing')
        if (res.ok) setPhoto(await res.json())
      } catch {}
    }
    load()
    const id = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative rounded-2xl overflow-hidden h-full border border-white/15 bg-amber-900/20">
      {photo?.url ? (
        <img
          src={photo.url}
          alt={photo.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-amber-800/20" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      {photo?.title && (
        <p className="absolute bottom-2 left-3 right-3 text-white/75 text-xs leading-snug line-clamp-2">
          {photo.title}
        </p>
      )}
    </div>
  )
}
