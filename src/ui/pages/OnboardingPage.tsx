import { useMemo, useState, type ReactNode } from 'react'

interface OnboardingPageProps {
  onFinish: () => void
  onSkip: () => void
}

function RuleIllustration() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-xs text-muted-foreground">示例：线索 3 1</div>
      <div className="flex items-center gap-3">
        <div className="flex gap-1 text-sm font-semibold">
          <span className="rounded bg-muted px-2 py-1">3</span>
          <span className="rounded bg-muted px-2 py-1">1</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {['filled', 'filled', 'filled', 'empty', 'filled'].map((state, index) => (
            <span
              key={index}
              className={`h-5 w-5 rounded border border-border ${
                state === 'filled' ? 'bg-primary' : 'bg-background'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function InputModeIllustration() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 grid grid-cols-2 gap-2 text-center text-xs font-medium">
        <div className="rounded-md bg-primary px-2 py-1 text-primary-foreground">填充</div>
        <div className="rounded-md bg-muted px-2 py-1 text-muted-foreground">标空</div>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }).map((_, index) => {
          const isFilled = index === 6 || index === 7 || index === 8 || index === 16
          const isMarked = index === 3 || index === 12
          return (
            <span
              key={index}
              className={`relative h-5 w-5 rounded border border-border ${
                isFilled ? 'bg-primary' : 'bg-background'
              }`}
            >
              {isMarked ? (
                <>
                  <span className="absolute left-[3px] top-[9px] h-[1.5px] w-[12px] rotate-45 bg-muted-foreground" />
                  <span className="absolute left-[3px] top-[9px] h-[1.5px] w-[12px] -rotate-45 bg-muted-foreground" />
                </>
              ) : null}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function DragIllustration() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 text-xs text-muted-foreground">按住并拖动，一次操作多个格子</div>
      <div className="relative grid grid-cols-6 gap-1">
        {Array.from({ length: 36 }).map((_, index) => {
          const active = [13, 14, 15, 16, 17].includes(index)
          return (
            <span
              key={index}
              className={`h-4 w-4 rounded border border-border ${active ? 'bg-primary/40' : 'bg-background'}`}
            />
          )
        })}
        <span className="pointer-events-none absolute left-[42px] top-[18px] text-xs text-primary">➜</span>
      </div>
    </div>
  )
}

function GoalIllustration() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted p-2">
          <div className="text-muted-foreground">生命值</div>
          <div className="mt-1 font-semibold text-red-500">♥ ♥ ♥</div>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <div className="text-muted-foreground">计时器</div>
          <div className="mt-1 font-semibold">00:42.5</div>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">填对全部答案即可通关，尽量少失误更高分。</div>
    </div>
  )
}

interface TutorialStep {
  title: string
  description: string
  points: string[]
  illustration: ReactNode
}

export function OnboardingPage({ onFinish, onSkip }: OnboardingPageProps) {
  const [stepIndex, setStepIndex] = useState(0)

  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        title: '先看线索，再下笔',
        description: '每一行和每一列的数字，告诉你连续填充块的长度。',
        points: ['数字之间至少隔 1 个空格', '先做确定性高的行列更容易打开局面'],
        illustration: <RuleIllustration />,
      },
      {
        title: '两种输入模式',
        description: '填充用于确认答案；标空用于排除不可能的格子。',
        points: ['点按单格可快速操作', '切换“填充/标空”可以减少误操作'],
        illustration: <InputModeIllustration />,
      },
      {
        title: '支持拖动批量操作',
        description: '按住棋盘拖动可以连续涂格，移动端体验更顺手。',
        points: ['拖动时会先预览影响范围', '松手后才会提交本次操作'],
        illustration: <DragIllustration />,
      },
      {
        title: '通关目标与节奏',
        description: '把棋盘恢复到正确图案并完成所有线索即可通关。',
        points: ['生命值耗尽会失败（可在设置里开关）', '你可以随时回设置重新学习本引导'],
        illustration: <GoalIllustration />,
      },
    ],
    [],
  )

  const isLast = stepIndex === steps.length - 1
  const step = steps[stepIndex]

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">新手引导</h1>
          <p className="text-xs text-muted-foreground">
            第 {stepIndex + 1} / {steps.length} 步
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1 text-sm"
          onClick={onSkip}
        >
          跳过引导
        </button>
      </header>

      {step.illustration}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold">{step.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {step.points.map((point) => (
            <li key={point} className="rounded-md bg-muted px-3 py-2 text-muted-foreground">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <div className="flex items-center justify-center gap-2">
        {steps.map((item, index) => (
          <span
            key={item.title}
            className={`h-2.5 w-2.5 rounded-full ${index === stepIndex ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      <footer className="mt-auto grid grid-cols-2 gap-3">
        <button
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium disabled:opacity-40"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={stepIndex === 0}
        >
          上一步
        </button>
        <button
          type="button"
          className="rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
          onClick={() => {
            if (isLast) {
              onFinish()
              return
            }
            setStepIndex((index) => Math.min(steps.length - 1, index + 1))
          }}
        >
          {isLast ? '开始游戏' : '下一步'}
        </button>
      </footer>
    </main>
  )
}
