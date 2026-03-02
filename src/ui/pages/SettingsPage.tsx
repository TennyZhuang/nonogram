import { useSettingsStore } from '@/store/settings-store'
import { THEME_OPTIONS } from '@/theme/themes'

interface SettingsPageProps {
  onBack: () => void
  onOpenTutorial: () => void
}

export function SettingsPage({ onBack, onOpenTutorial }: SettingsPageProps) {
  const theme = useSettingsStore((state) => state.theme)
  const setTheme = useSettingsStore((state) => state.setTheme)
  const livesEnabled = useSettingsStore((state) => state.livesEnabled)
  const toggleLivesEnabled = useSettingsStore((state) => state.toggleLivesEnabled)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">设置</h1>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          onClick={onBack}
        >
          返回
        </button>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">主题色</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          主题会同时作用于界面组件和棋盘画布。
        </p>
        <div className="space-y-3" role="radiogroup" aria-label="主题色选择">
          {THEME_OPTIONS.map((option) => {
            const selected = option.id === theme
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/60'
                }`}
                onClick={() => setTheme(option.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{option.name}</div>
                  <div className="text-xs text-muted-foreground">{selected ? '已启用' : '点击应用'}</div>
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
              </button>
            )
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">生命值模式</h2>
            <p className="mt-1 text-xs text-muted-foreground">开启后，错误操作会消耗生命值。</p>
          </div>
          <button
            type="button"
            className={`rounded-md px-3 py-1 text-xs font-medium ${
              livesEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            onClick={toggleLivesEnabled}
          >
            {livesEnabled ? '已开启' : '已关闭'}
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
          className="mt-3 w-full rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          onClick={onOpenTutorial}
        >
          重新学习引导
        </button>
      </section>
    </main>
  )
}
