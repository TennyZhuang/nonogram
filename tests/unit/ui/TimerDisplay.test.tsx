import React from 'react'
import { render, screen } from '@testing-library/react'

import { TimerDisplay } from '@/ui/components/TimerDisplay'

describe('TimerDisplay', () => {
  it('renders formatted elapsed time', () => {
    render(<TimerDisplay elapsedMs={65000} />)
    expect(screen.getByText('1:05')).toBeInTheDocument()
  })

  it('renders zero time correctly', () => {
    render(<TimerDisplay elapsedMs={0} />)
    expect(screen.getByText('0:00')).toBeInTheDocument()
  })

  it('renders time under one minute correctly', () => {
    render(<TimerDisplay elapsedMs={30000} />)
    expect(screen.getByText('0:30')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<TimerDisplay elapsedMs={0} />)
    expect(screen.getByLabelText('计时器')).toBeInTheDocument()
  })
})
