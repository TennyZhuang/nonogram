import { calculateBoardLayout } from '@/canvas/layout'
import { cellToPixel, pixelToCell, type CellCoord } from '@/canvas/hit-map'
import { createInputController } from '@/canvas/input-controller'

function createHarness() {
  const layout = calculateBoardLayout({
    canvasWidth: 375,
    canvasHeight: 812,
    gridSize: 10,
    maxRowClueLength: 3,
    maxColClueLength: 3,
  })
  const committed: CellCoord[][] = []

  const controller = createInputController({
    movementThreshold: 6,
    mapPointToCell: (point) => pixelToCell(point.x, point.y, layout),
    onCommit: (cells) => committed.push(cells),
  })

  const pointOf = (row: number, col: number) => {
    const rect = cellToPixel(row, col, layout)
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
    }
  }

  const outsidePoint = {
    x: layout.gridOriginX - 10,
    y: layout.gridOriginY - 10,
  }

  return { controller, committed, pointOf, outsidePoint }
}

describe('input-controller', () => {
  it('commits a single cell on tap', () => {
    const { controller, committed, pointOf } = createHarness()
    const p = pointOf(2, 3)
    controller.pointerDown(p)
    controller.pointerUp(p)

    expect(committed).toHaveLength(1)
    expect(committed[0]).toEqual([{ row: 2, col: 3 }])
  })

  it('locks horizontal direction during horizontal drag', () => {
    const { controller, committed, pointOf } = createHarness()
    controller.pointerDown(pointOf(4, 1))
    const snapshot = controller.pointerMove(pointOf(4, 3))
    controller.pointerUp(pointOf(4, 3))

    expect(snapshot.lockedDirection).toBe('horizontal')
    expect(snapshot.previewCells).toEqual([
      { row: 4, col: 1 },
      { row: 4, col: 2 },
      { row: 4, col: 3 },
    ])
    expect(committed[0]).toEqual(snapshot.previewCells)
  })

  it('locks vertical direction during vertical drag', () => {
    const { controller, committed, pointOf } = createHarness()
    controller.pointerDown(pointOf(1, 6))
    const snapshot = controller.pointerMove(pointOf(4, 6))
    controller.pointerUp(pointOf(4, 6))

    expect(snapshot.lockedDirection).toBe('vertical')
    expect(snapshot.previewCells).toEqual([
      { row: 1, col: 6 },
      { row: 2, col: 6 },
      { row: 3, col: 6 },
      { row: 4, col: 6 },
    ])
    expect(committed[0]).toEqual(snapshot.previewCells)
  })

  it('keeps one-axis preview after lock even when pointer moves diagonally', () => {
    const { controller, pointOf } = createHarness()
    controller.pointerDown(pointOf(2, 2))
    controller.pointerMove(pointOf(2, 5))
    const snapshot = controller.pointerMove(pointOf(5, 5))

    expect(snapshot.lockedDirection).toBe('horizontal')
    expect(snapshot.previewCells.every((cell) => cell.row === 2)).toBe(true)
  })

  it('commits the preview when pointer is released outside board', () => {
    const { controller, committed, pointOf, outsidePoint } = createHarness()
    controller.pointerDown(pointOf(3, 3))
    controller.pointerMove(pointOf(3, 5))
    const snapshot = controller.pointerUp(outsidePoint)

    expect(snapshot.phase).toBe('idle')
    expect(snapshot.previewCells).toHaveLength(0)
    expect(committed[0]).toEqual([
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ])
  })

  it('commits the preview on pointer cancel', () => {
    const { controller, committed, pointOf } = createHarness()
    controller.pointerDown(pointOf(5, 5))
    controller.pointerMove(pointOf(5, 7))
    const snapshot = controller.pointerCancel()

    expect(snapshot.phase).toBe('idle')
    expect(snapshot.previewCells).toEqual([])
    expect(committed[0]).toEqual([
      { row: 5, col: 5 },
      { row: 5, col: 6 },
      { row: 5, col: 7 },
    ])
  })

  it('drops the preview without commit on pointer abort', () => {
    const { controller, committed, pointOf } = createHarness()
    controller.pointerDown(pointOf(5, 5))
    controller.pointerMove(pointOf(5, 7))
    const snapshot = controller.pointerAbort()

    expect(snapshot.phase).toBe('idle')
    expect(snapshot.previewCells).toEqual([])
    expect(committed).toHaveLength(0)
  })

  it('still does not commit when no preview exists', () => {
    const { controller, committed, outsidePoint } = createHarness()
    controller.pointerUp(outsidePoint)
    controller.pointerCancel()

    expect(committed).toHaveLength(0)
  })
})
