import type { DifficultyTier } from '@/core/types'

interface DifficultySelectorProps {
  onSelect: (tier: DifficultyTier) => void
  recommendedTier?: DifficultyTier
}

const tierCards: Array<{
  tier: DifficultyTier
  label: string
  meta: string
  description: string
}> = [
  { tier: 1, label: '热身开局', meta: '10 × 10 · 轻松', description: '确定性强，适合快速找手感。' },
  { tier: 2, label: '渐入佳境', meta: '10 × 10 · 稳定', description: '开始需要一些排除与试探。' },
  { tier: 3, label: '进入状态', meta: '15 × 15 · 进阶', description: '图案更完整，推理链更长。' },
  { tier: 4, label: '认真开解', meta: '15 × 15 · 挑战', description: '需要更耐心地拆分线索。' },
  { tier: 5, label: '冲击奖励', meta: '15 × 15 · 高压', description: '适合想拿主题奖励的玩家。' },
  { tier: 6, label: '王者难度', meta: '15 × 15 · 极限', description: '给想要真正硬核一局的人。' },
]

export function DifficultySelector({ onSelect, recommendedTier }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tierCards.map((item) => {
        const isRecommended = item.tier === recommendedTier
        return (
          <button
            key={`tier-${item.tier}`}
            type="button"
            className={`rounded-xl border px-4 py-3 text-left transition hover:bg-muted ${
              isRecommended ? 'border-primary/40 bg-primary/5' : 'border-border'
            }`}
            onClick={() => onSelect(item.tier)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm text-muted-foreground">难度 D{item.tier}</div>
                <div className="mt-1 text-base font-semibold">{item.label}</div>
              </div>
              {isRecommended ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  推荐
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-xs font-medium text-muted-foreground">{item.meta}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
          </button>
        )
      })}
    </div>
  )
}
