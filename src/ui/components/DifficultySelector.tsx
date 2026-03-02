import type { DifficultyTier } from '@/core/types'

interface DifficultySelectorProps {
  onSelect: (tier: DifficultyTier) => void
}

const tiers: DifficultyTier[] = [1, 2, 3, 4, 5]

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiers.map((tier) => (
        <button
          key={`tier-${tier}`}
          type="button"
          className="rounded-lg border border-border px-4 py-3 text-left transition hover:bg-muted"
          onClick={() => onSelect(tier)}
        >
          <div className="text-sm text-muted-foreground">难度</div>
          <div className="text-base font-semibold">D{tier}</div>
        </button>
      ))}
    </div>
  )
}
