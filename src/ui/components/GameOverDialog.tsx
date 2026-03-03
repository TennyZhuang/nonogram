import { useEffect } from 'react'

import { useSound } from '@/hooks/useSound'

interface GameOverDialogProps {
  open: boolean
  onRestart: () => void
  onSwitchPuzzle: () => void
  onBack: () => void
}

export function GameOverDialog({
  open,
  onRestart,
  onSwitchPuzzle,
  onBack,
}: GameOverDialogProps) {
  const { play } = useSound()

  useEffect(() => {
    if (open) {
      play('error')
    }
  }, [open, play])

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
        <h2 className="text-lg font-bold">闯关失败</h2>
        <p className="mt-2 text-sm text-muted-foreground">生命值归零，选择下一步操作。</p>
        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={onRestart}
          >
            重新开始
          </button>
          <button
            type="button"
            className="rounded-md bg-muted px-4 py-2 text-sm font-medium"
            onClick={onSwitchPuzzle}
          >
            换一题
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
