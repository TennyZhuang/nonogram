import { useEffect } from 'react'

import { LoaderCircle, Sparkles } from 'lucide-react'

import type { DifficultyTier } from '@/core/types'
import { useAchievementStore } from '@/store/achievement-store'
import { useGameStore } from '@/store/game-store'
import { useSettingsStore } from '@/store/settings-store'
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

const LOADING_COPY: Record<DifficultyTier, { title: string; description: string; tips: string[] }> = {
  1: {
    title: '正在准备热身题',
    description: '给你一局开门顺手、图案清晰的入门局。',
    tips: ['先找能一眼确定的长线索', '看到 0 行列就直接整排标空'],
  },
  2: {
    title: '正在铺开进阶题',
    description: '这一局会多一点排除与验证，刚好热手。',
    tips: ['优先处理两端受限的线索', '利用已完成线索的高亮缩小范围'],
  },
  3: {
    title: '正在排布完整图案',
    description: '15×15 关卡会更像真的在一点点显影。',
    tips: ['先拆大块，再补细节', '拖动批量操作能明显省时间'],
  },
  4: {
    title: '正在打磨挑战题',
    description: '这局需要更稳定的节奏感，不急着赌。',
    tips: ['卡住时先换一条更确定的线', '标空会比盲填更重要'],
  },
  5: {
    title: '正在组装高压题',
    description: '拿下这一局，就离奖励主题更近一步。',
    tips: ['尽量保持零失误，节奏比速度更重要', '多利用整段完成后的边界自动标空'],
  },
  6: {
    title: '正在锻造王者题',
    description: '这一局偏硬核，但解开的成就感也最强。',
    tips: ['先建立全局确定区域，再深挖局部', '一旦卡住，回头检查已完成线索的相互约束'],
  },
}

function getLoadingCopy(tier: DifficultyTier | null) {
  return LOADING_COPY[tier ?? 1]
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
  const clearGame = useGameStore((state) => state.clearGame)

  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSoundEnabled = useSettingsStore((state) => state.toggleSoundEnabled)
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
    const loadingCopy = getLoadingCopy(generatingTier)
    const tierLabel = generatingTier ? `D${generatingTier}` : '挑战题'

    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <section className="w-full rounded-3xl border border-primary/15 bg-card p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LoaderCircle className="h-7 w-7 animate-spin" />
          </div>
          <p className="mt-4 text-xs font-semibold tracking-[0.18em] text-primary">{tierLabel}</p>
          <h1 className="mt-2 text-2xl font-bold">{loadingCopy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadingCopy.description}</p>

          <div className="mt-5 rounded-2xl border border-border bg-background px-4 py-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 25 }).map((_, index) => (
                <span
                  key={index}
                  className={`aspect-square rounded-md border border-border/70 ${
                    index % 3 === 0 ? 'bg-primary/12' : 'bg-muted/50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-primary/5 px-4 py-3 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              开局小提示
            </div>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {loadingCopy.tips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="mt-5 min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium"
            onClick={onBackHome}
          >
            返回首页
          </button>
        </section>
      </main>
    )
  }

  if (!puzzle || !game) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <h1 className="text-xl font-bold">未找到游戏</h1>
        <p className="mt-2 text-sm text-muted-foreground">请先从首页选择难度开始游戏。</p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={onBackHome}
        >
          返回首页
        </button>
      </main>
    )
  }

  const handleBackAfterResult = () => {
    clearGame()
    onBackHome()
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-3 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:max-w-6xl">
      <header className="flex items-center justify-between">
        <GameActionMenu
          soundEnabled={soundEnabled}
          onToggleSound={toggleSoundEnabled}
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

      <footer className="mt-auto pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden">
        <div className="mb-2 text-center text-xs text-muted-foreground">{modeStatus}</div>
        <ModeSwitch mode={mode} onChange={setMode} />
      </footer>

      <GameOverDialog
        open={game.status === 'failed'}
        onRestart={restart}
        onSwitchPuzzle={() => switchPuzzle()}
        onBack={handleBackAfterResult}
      />

      <GameClearDialog
        open={game.status === 'cleared'}
        puzzle={puzzle}
        board={game.board}
        livesRemaining={game.livesRemaining}
        maxLives={game.maxLives}
        elapsedMs={elapsedMs}
        mistakes={game.mistakes}
        onBack={handleBackAfterResult}
        onNext={() => switchPuzzle()}
      />

      <AchievementToast
        open={Boolean(lastUnlocked)}
        title={lastUnlocked?.name ?? ''}
        description={lastUnlocked?.reward ?? lastUnlocked?.description}
        onClose={clearToast}
      />
    </main>
  )
}
