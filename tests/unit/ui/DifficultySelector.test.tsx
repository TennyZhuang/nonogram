import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { DifficultySelector } from '@/ui/components/DifficultySelector'

describe('DifficultySelector', () => {
  it('calls onSelect with D3 tier', () => {
    const onSelect = vi.fn()
    render(<DifficultySelector onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /D3/ }))
    expect(onSelect).toHaveBeenCalledWith(3)
  })

  it('renders and supports D6 tier', () => {
    const onSelect = vi.fn()
    render(<DifficultySelector onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: /D6/ }))
    expect(onSelect).toHaveBeenCalledWith(6)
  })
})
