import { useEffect, useRef, useState } from 'react'

interface GameActionMenuProps {
  onRestart: () => void
  onSwitchPuzzle: () => void
  onBack: () => void
}

export function GameActionMenu({
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
        className="rounded-md border border-border px-3 py-1 text-xs"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        菜单
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-2 w-36 rounded-lg border border-border bg-card p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onRestart)}
          >
            重新开始
          </button>
          <button
            type="button"
            role="menuitem"
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onSwitchPuzzle)}
          >
            换一局
          </button>
          <button
            type="button"
            role="menuitem"
            className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => handleAction(onBack)}
          >
            返回
          </button>
        </div>
      ) : null}
    </div>
  )
}
