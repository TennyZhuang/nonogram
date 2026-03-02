import { useEffect } from 'react'

import { useGameStore } from '@/store/game-store'
import { useAchievementStore } from '@/store/achievement-store'
import { AchievementToast } from '@/ui/components/AchievementToast'
import { Board } from '@/ui/components/Board'
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
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 py-3">
      <header className="flex items-center justify-between">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-xs"
          onClick={onBackHome}
        >
          返回
        </button>
        <TimerDisplay elapsedMs={elapsedMs} />
        <LivesDisplay lives={game.livesRemaining} />
      </header>

      <Board
        puzzle={puzzle}
        board={game.board}
        mode={mode}
        onBatchCommit={batchAct}
      />

      <footer className="mt-auto pb-2">
        <div className="mb-2 text-center text-xs text-muted-foreground">
          当前模式：{mode === 'fill' ? '填充' : '标空'}
          {timerRunning ? '' : '（已暂停）'}
        </div>
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
