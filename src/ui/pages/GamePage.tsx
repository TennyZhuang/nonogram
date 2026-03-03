import { useEffect } from 'react'

import { useGameStore } from '@/store/game-store'
import { useAchievementStore } from '@/store/achievement-store'
import { AchievementToast } from '@/ui/components/AchievementToast'
import { Board } from '@/ui/components/Board'
import { GameActionMenu } from '@/ui/components/GameActionMenu'
import { GameClearDialog } from '@/ui/components/GameClearDialog'
import { GameOverDialog } from '@/ui/components/GameOverDialog'
import { LivesDisplay } from '@/ui/components/LivesDisplay'
import { ModeSwitch } from '@/ui/components/ModeSwitch'
import { TimerDisplay } from '@/ui/components/TimerDisplay'

interface GamePageProps {
  onBackHome: () => void
}

export function GamePage({ onBackHome }: GamePageProps) {
  const puzzle = useGameStore((state) => state.currentPuzzle)
  const game = useGameStore((state) => state.game)
  const isGeneratingPuzzle = useGameStore((state) => state.isGeneratingPuzzle)
  const generatingTier = useGameStore((state) => state.generatingTier)
  const mode = useGameStore((state) => state.mode)
  const elapsedMs = useGameStore((state) => state.elapsedMs)
  const timerRunning = useGameStore((state) => state.timerRunning)
  const setMode = useGameStore((state) => state.setMode)
  const batchAct = useGameStore((state) => state.batchAct)
  const restart = useGameStore((state) => state.restart)
  const switchPuzzle = useGameStore((state) => state.switchPuzzle)
  const pauseTimer = useGameStore((state) => state.pauseTimer)
  const resumeTimer = useGameStore((state) => state.resumeTimer)
  const syncElapsed = useGameStore((state) => state.syncElapsed)

  const lastUnlocked = useAchievementStore((state) => state.lastUnlocked)
  const clearToast = useAchievementStore((state) => state.clearToast)
  const modeLabel = mode === 'fill' ? '填充' : '标空'
  const modeStatus = `当前模式：${modeLabel}${timerRunning ? '' : '（已暂停）'}`

  useEffect(() => {
    const interval = window.setInterval(() => {
      syncElapsed()
    }, 250)
    return () => {
      window.clearInterval(interval)
    }
  }, [syncElapsed])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        pauseTimer()
      } else {
        resumeTimer()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [pauseTimer, resumeTimer])

  if (isGeneratingPuzzle) {
    const tierLabel = generatingTier ? ` ${generatingTier}` : ''
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-6">
        <h1 className="text-xl font-bold">正在生成题目{tierLabel}</h1>
        <p className="mt-2 text-sm text-muted-foreground">复杂题目会在后台计算，UI 不会被阻塞。</p>
        <button
          type="button"
          className="mt-4 rounded-md border border-border px-4 py-2 text-sm"
          onClick={onBackHome}
        >
          返回首页
        </button>
      </main>
    )
  }

  if (!puzzle || !game) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
        <h1 className="text-xl font-bold">未找到游戏</h1>
        <p className="mt-2 text-sm text-muted-foreground">请先从首页选择难度开始游戏。</p>
        <button
          type="button"
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
          onClick={onBackHome}
        >
          返回首页
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 py-3 lg:max-w-6xl">
      <header className="flex items-center justify-between">
        <GameActionMenu
          onRestart={restart}
          onSwitchPuzzle={() => switchPuzzle()}
          onBack={onBackHome}
        />
        <TimerDisplay elapsedMs={elapsedMs} />
        <LivesDisplay lives={game.livesRemaining} />
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="lg:min-w-0 lg:flex-1">
          <Board
            puzzle={puzzle}
            board={game.board}
            mode={mode}
            onBatchCommit={batchAct}
          />
        </div>

        <aside className="hidden lg:sticky lg:top-3 lg:block lg:w-44 lg:shrink-0">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 text-center text-xs text-muted-foreground">{modeStatus}</div>
            <ModeSwitch mode={mode} onChange={setMode} />
          </div>
        </aside>
      </div>

      <footer className="mt-auto pb-2 lg:hidden">
        <div className="mb-2 text-center text-xs text-muted-foreground">{modeStatus}</div>
        <ModeSwitch mode={mode} onChange={setMode} />
      </footer>

      <GameOverDialog
        open={game.status === 'failed'}
        onRestart={restart}
        onSwitchPuzzle={() => switchPuzzle()}
        onBack={onBackHome}
      />

      <GameClearDialog
        open={game.status === 'cleared'}
        puzzle={puzzle}
        board={game.board}
        livesRemaining={game.livesRemaining}
        maxLives={game.maxLives}
        elapsedMs={elapsedMs}
        mistakes={game.mistakes}
        onBack={onBackHome}
        onNext={() => switchPuzzle()}
      />

      <AchievementToast
        open={Boolean(lastUnlocked)}
        title={lastUnlocked?.name ?? ''}
        onClose={clearToast}
      />
    </main>
  )
}
