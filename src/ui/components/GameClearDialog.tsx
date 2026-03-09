import { useEffect, useMemo, useState } from 'react'

import { Sparkles, Trophy } from 'lucide-react'

import { formatElapsed } from '@/core/timer'
import type { Board, PuzzleDefinition } from '@/core/types'
import { useSound } from '@/hooks/useSound'
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

function getResultSummary(
  puzzle: PuzzleDefinition,
  mistakes: number,
  elapsedMs: number,
): { title: string; description: string } {
  if (mistakes === 0) {
    return {
      title: '漂亮，这是一局干净利落的通关。',
      description:
        puzzle.tier >= 5
          ? '高难局也能零失误，已经很有高手味道了。'
          : '零失误的节奏很舒服，继续保持这个手感。',
    }
  }

  if (elapsedMs < 90_000) {
    return {
      title: '这局节奏很顺。',
      description: '你几乎是一口气把图案完整拉了出来。',
    }
  }

  return {
    title: '稳扎稳打，也是一种漂亮的胜利。',
    description: '这类题本来就适合慢慢磨，通关本身就是最好的反馈。',
  }
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
  const { play } = useSound()
  const [boardPreviewUrl, setBoardPreviewUrl] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [isGeneratingShare, setIsGeneratingShare] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)
  const resultSummary = useMemo(
    () => getResultSummary(puzzle, mistakes, elapsedMs),
    [elapsedMs, mistakes, puzzle],
  )

  useEffect(() => {
    if (open) {
      play('success')
    }
  }, [open, play])

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
        <div className="flex items-start gap-3 rounded-xl bg-primary/8 p-4">
          <div className="rounded-full bg-primary/12 p-2 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">通关成功</h2>
            <p className="mt-1 text-sm text-muted-foreground">{resultSummary.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{resultSummary.description}</p>
          </div>
        </div>

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

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {puzzle.tier < 6
            ? `想要更刺激？返回首页试试 D${puzzle.tier + 1}。如果只想延续节奏，也可以直接同难度再来一局。`
            : 'D6 已是当前最高难度。要么继续同难度磨技巧，要么回首页换一种节奏。'}
        </div>

        {shareError ? <p className="mt-2 text-xs text-destructive">{shareError}</p> : null}

        <div className="mt-4 grid gap-2">
          <button
            type="button"
            className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleGenerateShare}
            disabled={isGeneratingShare}
          >
            {isGeneratingShare ? '截图生成中...' : '生成通关截图'}
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={onNext}
          >
            同难度再来一局
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium"
            onClick={onBack}
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}
