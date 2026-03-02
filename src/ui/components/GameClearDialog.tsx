import { formatElapsed } from '@/core/timer'

interface GameClearDialogProps {
  open: boolean
  elapsedMs: number
  mistakes: number
  onBack: () => void
  onNext: () => void
}

export function GameClearDialog({
  open,
  elapsedMs,
  mistakes,
  onBack,
  onNext,
}: GameClearDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-xl bg-card p-5 shadow-lg"
      >
        <h2 className="text-lg font-bold">通关成功</h2>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>用时：{formatElapsed(elapsedMs)}</p>
          <p>失误：{mistakes}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={onNext}
          >
            下一题
          </button>
          <button
            type="button"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium"
            onClick={onBack}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
