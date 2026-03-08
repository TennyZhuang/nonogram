import {
  getBuiltinFallbackPuzzleByTier,
  resetBuiltinFallbackCursorForTests,
} from '@/engine/builtin-puzzles'

describe('builtin fallback pool', () => {
  beforeEach(() => {
    resetBuiltinFallbackCursorForTests()
  })

  it('serves each tier-1 builtin puzzle once before repeating', () => {
    const seenIds = new Set(
      Array.from({ length: 10 }, () => getBuiltinFallbackPuzzleByTier(1).id),
    )

    expect(seenIds.size).toBe(10)
  })

  it('serves each tier-6 builtin puzzle once before repeating', () => {
    const seenIds = new Set(
      Array.from({ length: 50 }, () => getBuiltinFallbackPuzzleByTier(6).id),
    )

    expect(seenIds.size).toBe(50)
  })
})
