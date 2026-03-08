import { analyzeLine } from '@/engine/line-analysis'
import { EMPTY, FILLED, UNKNOWN } from '@/engine/solve-model'

describe('line analysis', () => {
  it('solves an empty clue line with full certainty', () => {
    const analysis = analyzeLine(
      [UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN],
      [0],
    )

    expect(analysis.satisfiable).toBe(true)
    expect(analysis.solutionCount).toBe(1)
    expect(analysis.forced).toEqual([EMPTY, EMPTY, EMPTY, EMPTY])
    expect(analysis.optionsAt).toEqual([
      [EMPTY],
      [EMPTY],
      [EMPTY],
      [EMPTY],
    ])
    expect(analysis.freedomCount).toBe(0)
  })

  it('finds the forced overlap cell for a centered run', () => {
    const analysis = analyzeLine(
      [UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN],
      [3],
    )

    expect(analysis.satisfiable).toBe(true)
    expect(analysis.solutionCount).toBe(3)
    expect(analysis.forced).toEqual([UNKNOWN, UNKNOWN, FILLED, UNKNOWN, UNKNOWN])
    expect(analysis.optionsAt[2]).toEqual([FILLED])
    expect(analysis.freedomCount).toBe(4)
  })

  it('tightens a partially solved line to a unique completion', () => {
    const analysis = analyzeLine(
      [EMPTY, FILLED, FILLED, UNKNOWN, UNKNOWN],
      [3],
    )

    expect(analysis.satisfiable).toBe(true)
    expect(analysis.solutionCount).toBe(1)
    expect(analysis.forced).toEqual([EMPTY, FILLED, FILLED, FILLED, EMPTY])
    expect(analysis.optionsAt).toEqual([
      [EMPTY],
      [FILLED],
      [FILLED],
      [FILLED],
      [EMPTY],
    ])
    expect(analysis.freedomCount).toBe(0)
  })

  it('detects contradictions in impossible partial lines', () => {
    const analysis = analyzeLine(
      [EMPTY, FILLED, EMPTY],
      [3],
    )

    expect(analysis.satisfiable).toBe(false)
    expect(analysis.solutionCount).toBe(0)
    expect(analysis.forced).toEqual([UNKNOWN, UNKNOWN, UNKNOWN])
    expect(analysis.optionsAt).toEqual([[], [], []])
    expect(analysis.freedomCount).toBe(0)
  })
})
