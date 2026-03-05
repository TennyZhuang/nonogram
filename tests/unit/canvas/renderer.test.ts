import {
  collectResolvedSegmentBoundaryCells,
  renderBoard,
  type BoardColors,
} from '@/canvas/renderer'
import type { BoardLayout } from '@/canvas/layout'
import type { Board, PuzzleClues } from '@/core/types'

const solution = [
  [false, true, true, false, false],
  [false, true, false, false, false],
  [false, false, false, false, false],
  [false, false, false, false, false],
  [false, false, false, false, false],
]

const clues: PuzzleClues = {
  rows: [[2], [1], [0], [0], [0]],
  cols: [[0], [2], [1], [0], [0]],
}

function createUnknownBoard(): Board {
  return Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => 'unknown' as const),
  )
}

describe('collectResolvedSegmentBoundaryCells', () => {
  it('collects unknown neighbors around resolved row segments on the active clue line', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
    ])
  })

  it('includes column-side neighbors when the active column clue segment is resolved', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'
    board[1][1] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
      { row: 2, col: 1 },
    ])
  })

  it('collects boundary marks for every touched clue line in a single swipe', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
      }),
    ).toEqual([
      { row: 0, col: 0 },
      { row: 0, col: 3 },
      { row: 1, col: 2 },
    ])
  })

  it('skips neighbors that are already known cells', () => {
    const board = createUnknownBoard()
    board[0][0] = 'marked-empty'
    board[0][1] = 'filled'
    board[0][2] = 'filled'
    board[0][3] = 'marked-empty'
    board[1][1] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [{ row: 0, col: 1 }],
      }),
    ).toEqual([{ row: 2, col: 1 }])
  })

  it('returns empty when no active clue is highlighted', () => {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'

    expect(
      collectResolvedSegmentBoundaryCells({
        board,
        solution,
        clues,
        activeCells: [],
      }),
    ).toEqual([])
  })
})

function createMockCanvas() {
  const calls: { method: string; args: unknown[] }[] = []
  const textCalls: { text: string; fillStyle: string }[] = []
  const ctx = {
    canvas: { width: 500, height: 500 },
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    setLineDash: vi.fn((...args: unknown[]) => {
      calls.push({ method: 'setLineDash', args })
    }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D

  ctx.fillText = vi.fn((text: string | number) => {
    textCalls.push({
      text: String(text),
      fillStyle: String(ctx.fillStyle),
    })
  }) as unknown as CanvasRenderingContext2D['fillText']

  return { ctx, calls, textCalls }
}

const testLayout: BoardLayout = {
  cellSize: 30,
  gridSize: 5,
  gridOriginX: 60,
  gridOriginY: 60,
  gridWidth: 150,
  gridHeight: 150,
  clueAreaWidth: 50,
  clueAreaHeight: 50,
  totalWidth: 220,
  totalHeight: 220,
}

const testColors: BoardColors = {
  background: '#ffffff',
  gridMinor: '#d1d5db',
  gridMajor: '#9ca3af',
  clueText: '#4b5563',
  clueActive: '#111827',
  clueResolved: '#16a34a',
  clueResolvedActive: '#15803d',
  fill: '#111827',
  emptyMark: '#6b7280',
  emptyMarkHint: 'rgba(107, 114, 128, 0.18)',
  revealedFill: '#ef4444',
  revealedEmpty: '#fde68a',
  preview: 'rgba(59, 130, 246, 0.25)',
  crosshair: 'rgba(17, 24, 39, 0.15)',
}

describe('renderBoard mark-empty hint', () => {
  it('draws dashed X hints on unknown cells when mode is mark-empty', () => {
    const board = createUnknownBoard()
    board[0][0] = 'filled'
    board[1][1] = 'marked-empty'

    const { ctx, calls } = createMockCanvas()
    renderBoard(ctx, {
      board,
      solution,
      clues,
      layout: testLayout,
      mode: 'mark-empty',
      colors: testColors,
    })

    // setLineDash is only called by drawMarkEmptyHint
    // 25 cells total, 2 non-unknown => 23 unknown cells should get hints
    expect(calls.filter((c) => c.method === 'setLineDash').length).toBe(23)
  })

  it('does not draw dashed X hints when mode is fill', () => {
    const board = createUnknownBoard()
    const { ctx, calls } = createMockCanvas()

    renderBoard(ctx, {
      board,
      solution,
      clues,
      layout: testLayout,
      mode: 'fill',
      colors: testColors,
    })

    expect(calls.filter((c) => c.method === 'setLineDash').length).toBe(0)
  })

  it('does not draw dashed X hints when mode is omitted (defaults to fill)', () => {
    const board = createUnknownBoard()
    const { ctx, calls } = createMockCanvas()

    renderBoard(ctx, {
      board,
      solution,
      clues,
      layout: testLayout,
      colors: testColors,
    })

    expect(calls.filter((c) => c.method === 'setLineDash').length).toBe(0)
  })
})

describe('renderBoard clue completion highlight', () => {
  function createResolvedBoard(): Board {
    const board = createUnknownBoard()
    board[0][1] = 'filled'
    board[0][2] = 'filled'
    board[1][1] = 'filled'
    return board
  }

  it('highlights resolved clues by default', () => {
    const { ctx, textCalls } = createMockCanvas()
    renderBoard(ctx, {
      board: createResolvedBoard(),
      solution,
      clues,
      layout: testLayout,
      colors: testColors,
    })

    expect(textCalls.some((call) => call.fillStyle === testColors.clueResolved)).toBe(true)
  })

  it('keeps resolved clues in normal color when highlight is disabled', () => {
    const { ctx, textCalls } = createMockCanvas()
    renderBoard(ctx, {
      board: createResolvedBoard(),
      solution,
      clues,
      layout: testLayout,
      colors: testColors,
      highlightResolvedClues: false,
    })

    expect(textCalls.some((call) => call.fillStyle === testColors.clueText)).toBe(true)
    expect(
      textCalls.some(
        (call) =>
          call.fillStyle === testColors.clueResolved ||
          call.fillStyle === testColors.clueResolvedActive,
      ),
    ).toBe(false)
  })
})
