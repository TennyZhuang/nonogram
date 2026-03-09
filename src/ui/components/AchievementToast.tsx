import { useEffect } from 'react'

interface AchievementToastProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
}

const TOAST_AUTO_CLOSE_MS = 2600

export function AchievementToast({ open, title, description, onClose }: AchievementToastProps) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      onClose()
    }, TOAST_AUTO_CLOSE_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-sm rounded-xl bg-primary px-4 py-3 text-left text-sm text-primary-foreground shadow-lg"
      >
        <div className="text-xs opacity-80">成就解锁</div>
        <div className="mt-1 font-semibold">{title}</div>
        {description ? <div className="mt-1 text-xs opacity-90">{description}</div> : null}
      </div>
    </div>
  )
}
