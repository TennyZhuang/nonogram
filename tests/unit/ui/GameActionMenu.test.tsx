import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { GameActionMenu } from '@/ui/components/GameActionMenu'

describe('GameActionMenu', () => {
  it('calls callbacks from menu actions', () => {
    const onToggleSound = vi.fn()
    const onRestart = vi.fn()
    const onSwitchPuzzle = vi.fn()
    const onBack = vi.fn()

    render(
      <GameActionMenu
        soundEnabled
        onToggleSound={onToggleSound}
        onRestart={onRestart}
        onSwitchPuzzle={onSwitchPuzzle}
        onBack={onBack}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '关闭音效' }))
    expect(onToggleSound).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '重新开始' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '换一局' }))
    expect(onSwitchPuzzle).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '返回首页' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('shows sound enable action when sound is off', () => {
    render(
      <GameActionMenu
        soundEnabled={false}
        onToggleSound={() => undefined}
        onRestart={() => undefined}
        onSwitchPuzzle={() => undefined}
        onBack={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    expect(screen.getByRole('menuitem', { name: '开启音效' })).toBeInTheDocument()
  })

  it('closes menu when clicking outside', () => {
    render(
      <GameActionMenu
        soundEnabled
        onToggleSound={() => undefined}
        onRestart={() => undefined}
        onSwitchPuzzle={() => undefined}
        onBack={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
