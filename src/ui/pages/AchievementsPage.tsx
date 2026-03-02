import type { DifficultyTier } from '@/core/types'
import { useAchievementStore } from '@/store/achievement-store'

interface AchievementsPageProps {
  onBack: () => void
  onStartTier: (tier: DifficultyTier) => void
}

export function AchievementsPage({ onBack, onStartTier }: AchievementsPageProps) {
  const achievements = useAchievementStore((state) => state.achievements)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">成就</h1>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          onClick={onBack}
        >
          返回
        </button>
      </header>

      <div className="space-y-3">
        {achievements.map((item) => (
          <article
            key={item.id}
            className={`rounded-lg border p-3 ${
              item.unlocked ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{item.name}</h2>
              <span className="text-xs text-muted-foreground">
                {item.unlocked ? '已解锁' : '未解锁'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>

      <button
        type="button"
        className="mt-auto rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        onClick={() => onStartTier(1)}
      >
        开始一局
      </button>
    </main>
  )
}
