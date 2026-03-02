import { scoreDifficulty } from '@/engine/scorer'
import type { SolverTrace } from '@/engine/solver'

function baseTrace(overrides: Partial<SolverTrace>): SolverTrace {
  return {
    phase1CellsSolved: 0,
    phase2CellsSolved: 0,
    usedPhase1: false,
    usedPhase2: false,
    usedPhase3: false,
    branchNodes: 0,
    guaranteedLivesToDeterministic: 0,
    ...overrides,
  }
}

describe('scorer', () => {
  it('maps 10x10 phase1-only traces to D1 or D2', () => {
    const tier = scoreDifficulty(
      baseTrace({
        phase1CellsSolved: 15,
        usedPhase1: true,
      }),
      10,
    )
    expect([1, 2]).toContain(tier)
  })

  it('maps 15x15 phase2-needed traces into D3-D5 range', () => {
    const tier = scoreDifficulty(
      baseTrace({
        phase2CellsSolved: 20,
        usedPhase2: true,
      }),
      15,
    )
    expect([3, 4, 5]).toContain(tier)
  })

  it('maps phase3-needed traces with <=2 guaranteed life losses to D6', () => {
    const tier = scoreDifficulty(
      baseTrace({
        usedPhase3: true,
        branchNodes: 8,
        guaranteedLivesToDeterministic: 1,
      }),
      15,
    )
    expect(tier).toBe(6)
  })

  it('maps phase3-needed traces without guaranteed-life evaluation to D5', () => {
    const tier = scoreDifficulty(
      baseTrace({
        usedPhase3: true,
        branchNodes: 16,
        guaranteedLivesToDeterministic: 4,
      }),
      15,
    )
    expect(tier).toBe(5)
  })
})
