import React from 'react'
import { render, screen } from '@testing-library/react'

import { LivesDisplay } from '@/ui/components/LivesDisplay'

describe('LivesDisplay', () => {
  it('renders the same number of hearts as lives', () => {
    const { container } = render(<LivesDisplay lives={2} />)
    expect(container.querySelectorAll('[data-testid="life-heart"]')).toHaveLength(2)
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
