import { useEffect, useState } from 'react'

import { formatElapsed } from '@/core/timer'
import type { Board, PuzzleDefinition } from '@/core/types'
import {
  createShareQrDataUrl,
  downloadBlob,
  generateResultShareImage,
  getShareFilename,
  NONOGRAM_SHARE_URL,
  renderResultBoardPreview,
} from '@/ui/components/game-share'

interface GameClearDialogProps {
  open: boolean
  puzzle: PuzzleDefinition
  board: Board
  livesRemaining: number
  maxLives: number
  elapsedMs: number
  mistakes: number
  onBack: () => void
  onNext: () => void
}

export function GameClearDialog({
  open,
  puzzle,
  board,
  livesRemaining,
  maxLives,
  elapsedMs,
  mistakes,
  onBack,
  onNext,
}: GameClearDialogProps) {
  const [boardPreviewUrl, setBoardPreviewUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isGeneratingShare, setIsGeneratingShare] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    try {
      const previewCanvas = renderResultBoardPreview(puzzle, board)
      setBoardPreviewUrl(previewCanvas.toDataURL('image/png'))
    } catch {
      setBoardPreviewUrl('')
    }
  }, [board, open, puzzle])

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    void createShareQrDataUrl()
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl('')
        }
      })

    return () => {
      cancelled = true
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleGenerateShare = async () => {
    setShareError(null)
    setIsGeneratingShare(true)
    try {
      const image = await generateResultShareImage({
        puzzle,
        board,
        elapsedMs,
        livesRemaining,
        maxLives,
        mistakes,
      })
      downloadBlob(image, getShareFilename(puzzle.tier))
    } catch {
      setShareError('截图生成失败，请稍后重试。')
    } finally {
      setIsGeneratingShare(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-5 shadow-lg"
      >
        <h2 className="text-lg font-bold">通关成功</h2>
        <p className="mt-1 text-sm text-muted-foreground">终局棋盘已生成，可直接保存通关截图。</p>

        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">生命</p>
            <p className="font-medium">{livesRemaining}/{maxLives}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">时间</p>
            <p className="font-medium">{formatElapsed(elapsedMs)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">难度</p>
            <p className="font-medium">D{puzzle.tier}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">失误</p>
            <p className="font-medium">{mistakes}</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-border bg-background p-2">
          {boardPreviewUrl ? (
            <img
              src={boardPreviewUrl}
              alt="终局棋盘"
              className="mx-auto h-auto w-full max-w-[320px] rounded-md border border-border"
            />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">终局棋盘生成中...</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Nonogram 链接二维码" className="h-20 w-20 rounded-md bg-white p-1" />
          ) : (
            <div className="h-20 w-20 rounded-md border border-dashed border-border bg-muted" />
          )}
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="text-sm font-medium text-foreground">扫码继续玩</p>
            <a
              href={NONOGRAM_SHARE_URL}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs underline"
            >
              {NONOGRAM_SHARE_URL}
            </a>
          </div>
        </div>

        {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleGenerateShare}
            disabled={isGeneratingShare}
          >
            {isGeneratingShare ? '截图生成中...' : '生成通关截图'}
          </button>
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
