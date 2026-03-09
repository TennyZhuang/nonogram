import React from 'react'
import { render, screen } from '@testing-library/react'

import { AchievementToast } from '@/ui/components/AchievementToast'

describe('AchievementToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders reward text and auto closes', () => {
    const onClose = vi.fn()
    render(
      <AchievementToast
        open
        title="征服 D5"
        description="奖励主题：赤金"
        onClose={onClose}
      />,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('征服 D5')).toBeInTheDocument()
    expect(screen.getByText('奖励主题：赤金')).toBeInTheDocument()

    vi.advanceTimersByTime(2600)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
