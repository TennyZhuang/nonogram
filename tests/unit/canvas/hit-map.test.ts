import { calculateBoardLayout } from '@/canvas/layout'
import { cellToPixel, pixelToCell } from '@/canvas/hit-map'

function createLayout() {
  return calculateBoardLayout({
    canvasWidth: 375,
    canvasHeight: 812,
    gridSize: 10,
    maxRowClueLength: 3,
    maxColClueLength: 3,
  })
}

function centerOfCell(row: number, col: number) {
  const layout = createLayout()
  const rect = cellToPixel(row, col, layout)
  return {
    layout,
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

describe('hit-map', () => {
  it('maps center point to the correct cell', () => {
    const { layout, x, y } = centerOfCell(4, 7)
    expect(pixelToCell(x, y, layout)).toEqual({ row: 4, col: 7 })
  })

  it('maps top-left and bottom-right centers correctly', () => {
    const first = centerOfCell(0, 0)
    const last = centerOfCell(9, 9)
    expect(pixelToCell(first.x, first.y, first.layout)).toEqual({ row: 0, col: 0 })
    expect(pixelToCell(last.x, last.y, last.layout)).toEqual({ row: 9, col: 9 })
  })

  it('returns null for clue area coordinates', () => {
    const layout = createLayout()
    const inClueArea = {
      x: layout.gridOriginX - 2,
      y: layout.gridOriginY + layout.cellSize / 2,
    }
    expect(pixelToCell(inClueArea.x, inClueArea.y, layout)).toBeNull()
  })

  it('returns null for points outside the canvas board area', () => {
    const layout = createLayout()
    expect(pixelToCell(-1, -1, layout)).toBeNull()
    expect(pixelToCell(layout.totalWidth + 10, layout.totalHeight + 10, layout)).toBeNull()
  })

  it('maps grid-line points to a valid cell', () => {
    const layout = createLayout()
    const x = layout.gridOriginX + layout.cellSize
    const y = layout.gridOriginY + layout.cellSize * 3
    const mapped = pixelToCell(x, y, layout)
    expect(mapped).not.toBeNull()
    expect(mapped).toEqual({ row: 3, col: 1 })
  })
})
