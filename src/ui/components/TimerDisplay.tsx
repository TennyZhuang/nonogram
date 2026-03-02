import { formatElapsed } from '@/core/timer'

interface TimerDisplayProps {
  elapsedMs: number
}

export function TimerDisplay({ elapsedMs }: TimerDisplayProps) {
  return (
    <div className="rounded-md bg-muted px-3 py-1 text-sm font-semibold" aria-label="计时器">
      {formatElapsed(elapsedMs)}
    </div>
  )
}
