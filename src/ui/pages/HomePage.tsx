import { ArrowRight, Play, Sparkles, Trophy } from 'lucide-react'

import { formatElapsed } from '@/core/timer'
import type { DifficultyTier } from '@/core/types'
import { DifficultySelector } from '@/ui/components/DifficultySelector'

interface CurrentSessionSummary {
  tier: DifficultyTier
  size: number
  elapsedMs: number
  livesRemaining: number
  maxLives: number
  mistakes: number
}

interface AchievementSummary {
  unlocked: number
  total: number
}

interface RecommendedChallenge {
  tier: DifficultyTier
  title: string
  description: string
}

interface HomePageProps {
  canContinue: boolean
  canInstall: boolean
  currentSession: CurrentSessionSummary | null
  achievementSummary: AchievementSummary
  recommendedChallenge: RecommendedChallenge
  onContinue: () => void
  onSelectDifficulty: (tier: DifficultyTier) => void
  onOpenAchievements: () => void
  onOpenSettings: () => void
  onInstall: () => void
}

export function HomePage({
  canContinue,
  canInstall,
  currentSession,
  achievementSummary,
  recommendedChallenge,
  onContinue,
  onSelectDifficulty,
  onOpenAchievements,
  onOpenSettings,
  onInstall,
}: HomePageProps) {
  const logoUrl = `${import.meta.env.BASE_URL}logo.svg`
  const progressPercent = Math.round(
    (achievementSummary.unlocked / Math.max(achievementSummary.total, 1)) * 100,
  )

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      <header className="mb-5 text-center">
        <img src={logoUrl} alt="数织 logo" className="mx-auto mb-3 h-20 w-20 rounded-2xl border border-border" />
        <h1 className="text-3xl font-bold">数织</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          这一局不只是解题，更是在慢慢揭开一张图案。
        </p>
      </header>

      <section className="mb-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary">推荐挑战</p>
            <h2 className="mt-1 text-lg font-semibold">{recommendedChallenge.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{recommendedChallenge.description}</p>
          </div>
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <button
            type="button"
            aria-label={`推荐挑战：${recommendedChallenge.title}`}
            className="rounded-xl bg-primary px-4 py-3 text-primary-foreground"
            onClick={() => onSelectDifficulty(recommendedChallenge.tier)}
          >
            <div className="flex items-center gap-2 text-xs opacity-90">
              <Play className="h-4 w-4" />
              D{recommendedChallenge.tier}
            </div>
            <div className="mt-1 flex items-center justify-between text-sm font-semibold">
              立即开局
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          <button
            type="button"
            className="rounded-xl border border-border bg-background px-4 py-3"
            onClick={onOpenAchievements}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Trophy className="h-4 w-4" />
              成就进度
            </div>
            <div className="mt-1 text-lg font-semibold">
              {achievementSummary.unlocked}/{achievementSummary.total}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </button>
        </div>
      </section>

      {canContinue && currentSession ? (
        <button
          type="button"
          className="mb-4 rounded-2xl border border-border bg-card px-4 py-4 text-left shadow-sm transition hover:bg-muted/30"
          onClick={onContinue}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">继续上次进度</div>
              <div className="mt-1 text-xs text-muted-foreground">
                D{currentSession.tier} · {currentSession.size} × {currentSession.size} · {formatElapsed(currentSession.elapsedMs)}
              </div>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              继续
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-muted-foreground">生命</div>
              <div className="mt-1 font-semibold">
                {currentSession.livesRemaining}/{currentSession.maxLives}
              </div>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-muted-foreground">失误</div>
              <div className="mt-1 font-semibold">{currentSession.mistakes}</div>
            </div>
            <div className="rounded-lg bg-muted px-3 py-2">
              <div className="text-muted-foreground">状态</div>
              <div className="mt-1 font-semibold">正在解</div>
            </div>
          </div>
        </button>
      ) : null}

      {canInstall ? (
        <button
          type="button"
          className="mb-4 rounded-lg border border-border px-4 py-3 text-sm font-medium"
          onClick={onInstall}
        >
          安装到主屏幕
        </button>
      ) : null}

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">难度选择</h2>
            <p className="mt-1 text-xs text-muted-foreground">先选手感，再决定要不要冲击更高难度。</p>
          </div>
        </div>
        <DifficultySelector
          onSelect={onSelectDifficulty}
          recommendedTier={recommendedChallenge.tier}
        />
      </section>

      <div className="mt-auto grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium"
          onClick={onOpenAchievements}
        >
          查看成就
        </button>
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium"
          onClick={onOpenSettings}
        >
          设置
        </button>
      </div>
    </main>
  )
}
