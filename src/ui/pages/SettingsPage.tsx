import { Lock, Volume2 } from 'lucide-react'

import { useAchievementStore } from '@/store/achievement-store'
import { useSettingsStore } from '@/store/settings-store'
import {
  getThemeUnlockRequirement,
  isThemeUnlocked,
  THEME_OPTIONS,
} from '@/theme/themes'

interface SettingsPageProps {
  onBack: () => void
  onOpenTutorial: () => void
}

export function SettingsPage({ onBack, onOpenTutorial }: SettingsPageProps) {
  const achievements = useAchievementStore((state) => state.achievements)
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSoundEnabled = useSettingsStore((state) => state.toggleSoundEnabled)
  const livesEnabled = useSettingsStore((state) => state.livesEnabled)
  const toggleLivesEnabled = useSettingsStore((state) => state.toggleLivesEnabled)
  const highlightCompletedClues = useSettingsStore((state) => state.highlightCompletedClues)
  const toggleHighlightCompletedClues = useSettingsStore(
    (state) => state.toggleHighlightCompletedClues,
  )

  const unlockedAchievementIds = new Set(
    achievements.filter((item) => item.unlocked).map((item) => item.id),
  )

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 pt-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">设置</h1>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-border px-4 py-2 text-sm font-medium"
          onClick={onBack}
        >
          返回
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">主题色</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          主题会同时作用于界面组件和棋盘画布。部分主题需要先完成成就解锁。
        </p>
        <div className="space-y-3" role="radiogroup" aria-label="主题色选择">
          {THEME_OPTIONS.map((option) => {
            const selected = option.id === theme
            const unlocked = isThemeUnlocked(option.id, unlockedAchievementIds)
            const unlockRequirement = getThemeUnlockRequirement(option.id)
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={!unlocked}
                disabled={!unlocked}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected
                    ? 'border-primary bg-primary/10'
                    : unlocked
                      ? 'border-border hover:bg-muted/60'
                      : 'border-border bg-muted/40 opacity-80'
                }`}
                onClick={() => setTheme(option.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{option.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selected ? '已启用' : unlocked ? '点击应用' : '尚未解锁'}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                <div className="mt-2 flex gap-2">
                  {option.swatches.map((color) => (
                    <span
                      key={`${option.id}-${color}`}
                      className="h-4 w-4 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                {!unlocked && unlockRequirement ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    {unlockRequirement.description}
                  </div>
                ) : null}
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">音效</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">移动端改为收纳到菜单与设置中，避免遮挡底部操作。</p>
          </div>
          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-2 text-xs font-medium ${
              soundEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            onClick={toggleSoundEnabled}
          >
            {soundEnabled ? '已开启' : '已关闭'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">生命值模式</h2>
            <p className="mt-1 text-xs text-muted-foreground">开启后，错误操作会消耗生命值。</p>
          </div>
          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-2 text-xs font-medium ${
              livesEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            onClick={toggleLivesEnabled}
          >
            {livesEnabled ? '已开启' : '已关闭'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">线索完成高亮</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              关闭后，已完成的线索数字会保持普通颜色。
            </p>
          </div>
          <button
            type="button"
            className={`min-h-11 rounded-lg px-3 py-2 text-xs font-medium ${
              highlightCompletedClues
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
            onClick={toggleHighlightCompletedClues}
          >
            {highlightCompletedClues ? '已开启' : '已关闭'}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">新手引导</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          可随时重新学习玩法说明（图文步骤）。
        </p>
        <button
          type="button"
          className="mt-3 min-h-11 w-full rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted"
          onClick={onOpenTutorial}
        >
          重新学习引导
        </button>
      </section>
    </main>
  )
}
