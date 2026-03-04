interface ErrorToastProps {
  open: boolean
  message: string
  onClose: () => void
}

export function ErrorToast({ open, message, onClose }: ErrorToastProps) {
  if (!open) {
    return null
  }

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed bottom-5 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 rounded-lg bg-destructive px-4 py-3 text-left text-sm text-destructive-foreground shadow-lg"
    >
      <div className="text-xs opacity-80">存储错误</div>
      <div className="font-semibold">{message}</div>
    </button>
  )
}
