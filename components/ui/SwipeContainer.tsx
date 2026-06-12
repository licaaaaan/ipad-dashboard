'use client'
import { useState, useRef, Children } from 'react'
import DotIndicator from './DotIndicator'

interface SwipeContainerProps {
  children: React.ReactNode
  className?: string
}

export default function SwipeContainer({ children, className = '' }: SwipeContainerProps) {
  const [active, setActive] = useState(0)
  const startX = useRef<number | null>(null)
  const count = Children.count(children)
  const slides = Children.toArray(children)

  function handleDragStart(x: number) {
    startX.current = x
  }

  function handleDragEnd(x: number) {
    if (startX.current === null) return
    const delta = x - startX.current
    if (Math.abs(delta) > 50) {
      if (delta < 0 && active < count - 1) setActive(active + 1)
      if (delta > 0 && active > 0) setActive(active - 1)
    }
    startX.current = null
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0].clientX)}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${active * 100}%)`, width: `${count * 100}%` }}
        >
          {slides.map((slide, i) => (
            <div key={i} style={{ width: `${100 / count}%` }} className="h-full flex-shrink-0">
              {slide}
            </div>
          ))}
        </div>
      </div>
      <DotIndicator count={count} active={active} />
    </div>
  )
}
