import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { GameActionMenu } from '@/ui/components/GameActionMenu'

describe('GameActionMenu', () => {
  it('calls callbacks from menu actions', () => {
    const onRestart = vi.fn()
    const onSwitchPuzzle = vi.fn()
    const onBack = vi.fn()

    render(
      <GameActionMenu
        onRestart={onRestart}
        onSwitchPuzzle={onSwitchPuzzle}
        onBack={onBack}
      />,
    )

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

  it('closes menu when clicking outside', () => {
    render(
      <GameActionMenu
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
