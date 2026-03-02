import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { ModeSwitch } from '@/ui/components/ModeSwitch'

describe('ModeSwitch', () => {
  it('switches mode and triggers callback', () => {
    const onChange = vi.fn()
    render(<ModeSwitch mode="fill" onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: '标空' }))
    expect(onChange).toHaveBeenCalledWith('mark-empty')
  })
})
