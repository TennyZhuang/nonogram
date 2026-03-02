interface LivesDisplayProps {
  lives: number
}

export function LivesDisplay({ lives }: LivesDisplayProps) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium" aria-label="生命值">
      <span className="text-red-500">生命</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.max(0, lives) }, (_, index) => (
          <span key={`life-${index}`} data-testid="life-heart" aria-hidden="true">
            ❤️
          </span>
        ))}
      </div>
      <span>{lives}</span>
    </div>
  )
}
