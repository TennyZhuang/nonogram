import { expect, test } from '@playwright/test'
import { skipOnboardingIfVisible } from './helpers'

interface PuzzleData {
  size: number
  solution: boolean[][]
  clues: { rows: number[][]; cols: number[][] }
}

interface LayoutInfo {
  cellSize: number
  gridOriginX: number
  gridOriginY: number
}

const MIN_CLUE_AREA = 20
const CLUE_CHAR_WIDTH = 7
const CLUE_CHAR_HEIGHT = 12

function computeLayout(
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number,
  clues: PuzzleData['clues'],
): LayoutInfo {
  const padding = 8
  const maxRowClueLength = Math.max(
    ...clues.rows.map((clue) => clue.join(' ').length),
    1,
  )
  const maxColClueLength = Math.max(
    ...clues.cols.map((clue) => clue.length),
    1,
  )

  const clueAreaWidth = Math.max(
    MIN_CLUE_AREA,
    maxRowClueLength * CLUE_CHAR_WIDTH + padding,
  )
  const clueAreaHeight = Math.max(
    MIN_CLUE_AREA,
    maxColClueLength * CLUE_CHAR_HEIGHT + padding,
  )

  const usableWidth = Math.max(1, canvasWidth - padding * 2 - clueAreaWidth)
  const usableHeight = Math.max(1, canvasHeight - padding * 2 - clueAreaHeight)
  const cellSize = Math.max(
    1,
    Math.floor(Math.min(usableWidth / gridSize, usableHeight / gridSize)),
  )

  return {
    cellSize,
    gridOriginX: padding + clueAreaWidth,
    gridOriginY: padding + clueAreaHeight,
  }
}

test('用求解器完整打通一盘 D1 游戏', async ({ page }) => {
  await page.goto('/')
  await skipOnboardingIfVisible(page)

  // Start a D1 game
  await page.getByRole('button', { name: /D1/ }).click()

  // Wait for game board to be visible
  const canvas = page.getByTestId('game-board-canvas')
  await expect(canvas).toBeVisible()

  // Wait a moment for the board layout to stabilize (ResizeObserver)
  await page.waitForTimeout(500)

  // Extract puzzle data from the Zustand store
  const puzzleData = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    const state = store.getState()
    const puzzle = state.currentPuzzle
    return {
      size: puzzle.size as number,
      solution: puzzle.solution as boolean[][],
      clues: puzzle.clues as { rows: number[][]; cols: number[][] },
    }
  })

  expect(puzzleData.size).toBeGreaterThan(0)
  expect(puzzleData.solution.length).toBe(puzzleData.size)

  // Get canvas bounding box
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return

  // Compute board layout using the same formula as the app
  const layout = computeLayout(box.width, box.height, puzzleData.size, puzzleData.clues)

  // Click each cell that should be filled according to the solution
  for (let row = 0; row < puzzleData.size; row++) {
    for (let col = 0; col < puzzleData.size; col++) {
      if (puzzleData.solution[row][col]) {
        const clickX = box.x + layout.gridOriginX + col * layout.cellSize + layout.cellSize / 2
        const clickY = box.y + layout.gridOriginY + row * layout.cellSize + layout.cellSize / 2
        await page.mouse.click(clickX, clickY)
      }
    }
  }

  // Verify the game is cleared
  await expect(page.getByText('通关成功')).toBeVisible({ timeout: 5000 })

  // Verify zero mistakes
  const gameState = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const store = (window as any).__gameStore
    return {
      status: store.getState().game.status as string,
      mistakes: store.getState().game.mistakes as number,
    }
  })
  expect(gameState.status).toBe('cleared')
  expect(gameState.mistakes).toBe(0)
})
