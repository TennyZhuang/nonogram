import type { InputMode } from '@/core/types'

interface ModeSwitchProps {
  mode: InputMode
  onChange: (mode: InputMode) => void
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  const isFill = mode === 'fill'
  const fillClasses = isFill
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-muted-foreground'
  const emptyClasses = !isFill
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-muted-foreground'

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1 lg:grid-cols-1">
      <button
        type="button"
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${fillClasses}`}
        onClick={() => onChange('fill')}
        aria-pressed={isFill}
      >
        填充
      </button>
      <button
        type="button"
        className={`rounded-md px-4 py-2 text-sm font-medium transition ${emptyClasses}`}
        onClick={() => onChange('mark-empty')}
        aria-pressed={!isFill}
      >
        标空
      </button>
    </div>
  )
}
