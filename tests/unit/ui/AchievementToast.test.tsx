import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { AchievementToast } from '@/ui/components/AchievementToast'

describe('AchievementToast', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <AchievementToast open={false} title="Test achievement" onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders achievement title when open is true', () => {
    render(<AchievementToast open={true} title="首次通关" onClose={() => {}} />)
    expect(screen.getByText('成就解锁')).toBeInTheDocument()
    expect(screen.getByText('首次通关')).toBeInTheDocument()
  })

  it('calls onClose when clicked', () => {
    const onClose = vi.fn()
    render(<AchievementToast open={true} title="Test achievement" onClose={onClose} />)

    const toast = screen.getByRole('button')
    fireEvent.click(toast)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
