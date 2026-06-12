interface DotIndicatorProps {
  count: number
  active: number
}

export default function DotIndicator({ count, active }: DotIndicatorProps) {
  return (
    <div className="flex gap-1.5 justify-center mt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
            i === active ? 'bg-white scale-125' : 'bg-white/30'
          }`}
        />
      ))}
    </div>
  )
}
