import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { ErrorToast } from '@/ui/components/ErrorToast'

describe('ErrorToast', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ErrorToast open={false} message="Test error" onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders error message when open is true', () => {
    render(<ErrorToast open={true} message="Test error message" onClose={() => {}} />)
    expect(screen.getByText('存储错误')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('calls onClose when clicked', () => {
    const onClose = vi.fn()
    render(<ErrorToast open={true} message="Test error" onClose={onClose} />)

    const toast = screen.getByRole('button')
    fireEvent.click(toast)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
