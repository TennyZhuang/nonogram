import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { SoundToggle } from '@/ui/components/SoundToggle'
import { useSettingsStore } from '@/store/settings-store'

describe('SoundToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    useSettingsStore.setState({ soundEnabled: false })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders with sound disabled by default', () => {
    render(<SoundToggle />)
    expect(screen.getByLabelText('开启音效')).toBeInTheDocument()
  })

  it('renders with sound enabled when store state is true', () => {
    useSettingsStore.setState({ soundEnabled: true })
    render(<SoundToggle />)
    expect(screen.getByLabelText('关闭音效')).toBeInTheDocument()
  })

  it('toggles sound when clicked', () => {
    render(<SoundToggle />)
    const button = screen.getByRole('button')

    // Initially disabled
    expect(screen.getByLabelText('开启音效')).toBeInTheDocument()

    // Click to enable
    fireEvent.click(button)
    expect(useSettingsStore.getState().soundEnabled).toBe(true)
  })

  it('has accessible title attribute', () => {
    render(<SoundToggle />)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('title', '开启音效')
  })
})
