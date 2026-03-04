import { calculateBoardLayout } from '@/canvas/layout'

describe('canvas layout', () => {
  it('keeps 10x10 cells large enough on 375px width', () => {
    const layout = calculateBoardLayout({
      canvasWidth: 375,
      canvasHeight: 812,
      gridSize: 10,
      maxRowClueLength: 3,
      maxColClueLength: 3,
    })
    expect(layout.cellSize).toBeGreaterThanOrEqual(25)
  })

  it('keeps 15x15 cells usable on 375px width', () => {
    const layout = calculateBoardLayout({
      canvasWidth: 375,
      canvasHeight: 812,
      gridSize: 15,
      maxRowClueLength: 3,
      maxColClueLength: 3,
    })
    expect(layout.cellSize).toBeGreaterThanOrEqual(18)
    expect(layout.rowClueCompact).toBe(false)
    expect(layout.colClueCompact).toBe(false)
  })

  it('keeps 15x15 cells above 20px on wider phone', () => {
    const layout = calculateBoardLayout({
      canvasWidth: 430,
      canvasHeight: 900,
      gridSize: 15,
      maxRowClueLength: 3,
      maxColClueLength: 3,
    })
    expect(layout.cellSize).toBeGreaterThan(20)
  })

  it('allocates wider clue area for longer row clues', () => {
    const shortClueLayout = calculateBoardLayout({
      canvasWidth: 375,
      canvasHeight: 812,
      gridSize: 15,
      maxRowClueLength: 1,
      maxColClueLength: 1,
    })
    const longClueLayout = calculateBoardLayout({
      canvasWidth: 375,
      canvasHeight: 812,
      gridSize: 15,
      maxRowClueLength: 3,
      maxColClueLength: 1,
    })
    expect(longClueLayout.clueAreaWidth).toBeGreaterThan(shortClueLayout.clueAreaWidth)
  })

  it('compresses oversized clue area to keep 15x15 touch target', () => {
    const layout = calculateBoardLayout({
      canvasWidth: 375,
      canvasHeight: 812,
      gridSize: 15,
      maxRowClueLength: 12,
      maxColClueLength: 3,
    })

    expect(layout.cellSize).toBeGreaterThanOrEqual(20)
    expect(layout.rowClueCompact).toBe(true)
    expect(layout.clueAreaWidth).toBeLessThan(12 * 7 + 8)
  })
})
