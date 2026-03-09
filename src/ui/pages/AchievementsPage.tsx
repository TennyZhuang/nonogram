import type { DifficultyTier } from '@/core/types'
import { countUnlockedAchievements, useAchievementStore } from '@/store/achievement-store'

interface AchievementsPageProps {
  onBack: () => void
  onStartTier: (tier: DifficultyTier) => void
}

export function AchievementsPage({ onBack, onStartTier }: AchievementsPageProps) {
  const achievements = useAchievementStore((state) => state.achievements)
  const unlockedCount = countUnlockedAchievements(achievements)
  const progressPercent = Math.round((unlockedCount / Math.max(achievements.length, 1)) * 100)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">成就</h1>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium"
          onClick={onBack}
        >
          返回
        </button>
      </header>

      <section className="mb-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary">进度总览</p>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <div className="text-3xl font-bold">
              {unlockedCount}/{achievements.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">每个里程碑都该带来一点新鲜感。</p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
            {progressPercent}%
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progressPercent}%` }} />
        </div>
      </section>

      <div className="space-y-3">
        {achievements.map((item) => (
          <article
            key={item.id}
            className={`rounded-xl border p-4 ${
              item.unlocked ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.unlocked ? '已解锁' : '未解锁'}
              </span>
            </div>
            {item.reward ? (
              <div className="mt-3 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">奖励</span>
                {' · '}
                {item.reward}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <button
        type="button"
        className="mt-auto min-h-11 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        onClick={() => onStartTier(1)}
      >
        开始一局
      </button>
    </main>
  )
}
