import { useEffect, useRef } from 'react'

import { useSound } from '@/hooks/useSound'

interface LivesDisplayProps {
  lives: number
}

export function LivesDisplay({ lives }: LivesDisplayProps) {
  const { play } = useSound()
  const prevLivesRef = useRef(lives)

  useEffect(() => {
    if (prevLivesRef.current > lives) {
      play('error')
    }
    prevLivesRef.current = lives
  }, [lives, play])

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
