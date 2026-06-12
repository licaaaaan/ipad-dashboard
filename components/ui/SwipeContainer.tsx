'use client'
import { useState, useRef, Children } from 'react'
import DotIndicator from './DotIndicator'

interface SwipeContainerProps {
  children: React.ReactNode
  className?: string
}

export default function SwipeContainer({ children, className = '' }: SwipeContainerProps) {
  const [active, setActive] = useState(0)
  const [dragDelta, setDragDelta] = useState(0)
  const startX = useRef<number | null>(null)
  const count = Children.count(children)
  const slides = Children.toArray(children)

  function handleDragStart(x: number) {
    startX.current = x
    setDragDelta(0)
  }

  function handleDragMove(x: number) {
    if (startX.current === null) return
    setDragDelta(x - startX.current)
  }

  function handleDragEnd(x: number) {
    if (startX.current === null) return
    const delta = x - startX.current
    setDragDelta(0)
    if (Math.abs(delta) > 50) {
      if (delta < 0 && active < count - 1) setActive(active + 1)
      if (delta > 0 && active > 0) setActive(active - 1)
    }
    startX.current = null
  }

  function handleDragCancel() {
    startX.current = null
    setDragDelta(0)
  }

  const isDragging = startX.current !== null
  const translateX = -active * 100 + (dragDelta / (typeof window !== 'undefined' ? window.innerWidth : 1024)) * 100

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div
        className="flex-1 overflow-hidden relative"
        onMouseDown={(e) => handleDragStart(e.clientX)}
        onMouseMove={(e) => handleDragMove(e.clientX)}
        onMouseUp={(e) => handleDragEnd(e.clientX)}
        onMouseLeave={handleDragCancel}
        onTouchStart={(e) => handleDragStart(e.touches[0]?.clientX ?? 0)}
        onTouchMove={(e) => handleDragMove(e.touches[0]?.clientX ?? 0)}
        onTouchEnd={(e) => handleDragEnd(e.changedTouches[0]?.clientX ?? 0)}
      >
        <div
          className={`flex h-full ${isDragging ? '' : 'transition-transform duration-300 ease-in-out'}`}
          style={{ transform: `translateX(${translateX}%)`, width: `${count * 100}%` }}
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
