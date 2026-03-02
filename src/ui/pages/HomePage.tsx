import type { DifficultyTier } from '@/core/types'
import { DifficultySelector } from '@/ui/components/DifficultySelector'

interface HomePageProps {
  canContinue: boolean
  canInstall: boolean
  onContinue: () => void
  onSelectDifficulty: (tier: DifficultyTier) => void
  onOpenAchievements: () => void
  onInstall: () => void
}

export function HomePage({
  canContinue,
  canInstall,
  onContinue,
  onSelectDifficulty,
  onOpenAchievements,
  onInstall,
}: HomePageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">数织</h1>
        <p className="mt-2 text-sm text-muted-foreground">选择难度，开始新的一局。</p>
      </header>

      {canContinue ? (
        <button
          type="button"
          className="mb-4 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          onClick={onContinue}
        >
          继续游戏
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

      <section>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">难度选择</h2>
        <DifficultySelector onSelect={onSelectDifficulty} />
      </section>

      <button
        type="button"
        className="mt-auto rounded-lg border border-border px-4 py-3 text-sm font-medium"
        onClick={onOpenAchievements}
      >
        查看成就
      </button>
    </main>
  )
}
