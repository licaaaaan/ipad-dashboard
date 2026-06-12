interface GlassTileProps {
  gradient: string       // Tailwind gradient classes, e.g. "from-purple-700 to-cyan-500"
  className?: string
  children: React.ReactNode
}

export default function GlassTile({ gradient, className = '', children }: GlassTileProps) {
  return (
    <div
      className={`
        relative rounded-2xl p-4 overflow-hidden
        bg-gradient-to-br ${gradient} bg-opacity-50
        border border-white/15 backdrop-blur-md
        transition-transform duration-150 active:scale-[0.98]
        ${className}
      `}
    >
      <div className="absolute inset-0 bg-black/40 rounded-2xl" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  )
}
