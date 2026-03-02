import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { GameOverDialog } from '@/ui/components/GameOverDialog'

describe('GameOverDialog', () => {
  it('calls onRestart when clicking restart button', () => {
    const onRestart = vi.fn()
    render(
      <GameOverDialog
        open
        onRestart={onRestart}
        onSwitchPuzzle={() => undefined}
        onBack={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '重新开始' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
  })
})
