import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { Board } from '@/core/types'
import { puzzle5x5 } from '@/test-fixtures/puzzles'
import { GameClearDialog } from '@/ui/components/GameClearDialog'
import * as shareUtils from '@/ui/components/game-share'

vi.mock('@/ui/components/FireworksOverlay', () => ({
  FireworksOverlay: () => null,
}))

vi.mock('@/ui/components/game-share', () => ({
  NONOGRAM_SHARE_URL: 'https://gh.zhuangty.com/nonogram/',
  createShareQrDataUrl: vi.fn(),
  downloadBlob: vi.fn(),
  generateResultShareImage: vi.fn(),
  getShareFilename: vi.fn(),
  renderResultBoardPreview: vi.fn(),
}))

const solvedBoard: Board = puzzle5x5.solution.map((row) =>
  row.map((filled) => (filled ? 'filled' : 'marked-empty')),
)

describe('GameClearDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(shareUtils.createShareQrDataUrl).mockResolvedValue('data:image/png;base64,qr')
    vi.mocked(shareUtils.getShareFilename).mockReturnValue('share.png')
    vi.mocked(shareUtils.generateResultShareImage).mockResolvedValue(
      new Blob(['share'], { type: 'image/png' }),
    )
    vi.mocked(shareUtils.renderResultBoardPreview).mockReturnValue({
      toDataURL: () => 'data:image/png;base64,board',
    } as HTMLCanvasElement)
  })

  it('renders final stats and board preview', async () => {
    render(
      <GameClearDialog
        open
        puzzle={puzzle5x5}
        board={solvedBoard}
        livesRemaining={2}
        maxLives={3}
        elapsedMs={65_000}
        mistakes={1}
        onBack={() => undefined}
        onNext={() => undefined}
      />,
    )

    expect(screen.getByText('通关成功')).toBeInTheDocument()
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('1:05')).toBeInTheDocument()
    expect(screen.getByText('D1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '终局棋盘' })).toBeInTheDocument()

    await waitFor(() => {
      expect(shareUtils.createShareQrDataUrl).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('img', { name: 'Nonogram 链接二维码' })).toBeInTheDocument()
    })
  })

  it('generates and downloads share screenshot', async () => {
    render(
      <GameClearDialog
        open
        puzzle={puzzle5x5}
        board={solvedBoard}
        livesRemaining={3}
        maxLives={3}
        elapsedMs={70_000}
        mistakes={0}
        onBack={() => undefined}
        onNext={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '生成通关截图' }))

    await waitFor(() => {
      expect(shareUtils.generateResultShareImage).toHaveBeenCalledWith({
        puzzle: puzzle5x5,
        board: solvedBoard,
        elapsedMs: 70_000,
        livesRemaining: 3,
        maxLives: 3,
        mistakes: 0,
      })
      expect(shareUtils.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'share.png')
    })
  })
})
