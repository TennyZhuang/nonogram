interface AchievementToastProps {
  open: boolean
  title: string
  onClose: () => void
}

export function AchievementToast({ open, title, onClose }: AchievementToastProps) {
  if (!open) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed bottom-5 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-lg bg-primary px-4 py-3 text-left text-sm text-primary-foreground shadow-lg"
    >
      <div className="text-xs opacity-80">成就解锁</div>
      <div className="font-semibold">{title}</div>
    </button>
  )
}
