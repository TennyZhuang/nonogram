import { useEffect, useRef, useState } from 'react'

interface GameActionMenuProps {
  soundEnabled: boolean
  onToggleSound: () => void
  onRestart: () => void
  onSwitchPuzzle: () => void
  onBack: () => void
}

export function GameActionMenu({
  soundEnabled,
  onToggleSound,
  onRestart,
  onSwitchPuzzle,
  onBack,
}: GameActionMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const handleAction = (action: () => void) => {
    setOpen(false)
    action()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="min-h-11 min-w-11 rounded-lg border border-border px-4 py-2 text-sm font-medium"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        菜单
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 w-40 rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onToggleSound)}
          >
            {soundEnabled ? '关闭音效' : '开启音效'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="mt-1 min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onRestart)}
          >
            重新开始
          </button>
          <button
            type="button"
            role="menuitem"
            className="mt-1 min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onSwitchPuzzle)}
          >
            换一局
          </button>
          <button
            type="button"
            role="menuitem"
            className="mt-1 min-h-11 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onBack)}
          >
            返回首页
          </button>
        </div>
      ) : null}
    </div>
  )
}
