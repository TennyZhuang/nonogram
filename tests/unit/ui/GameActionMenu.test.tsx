import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

import { GameActionMenu } from '@/ui/components/GameActionMenu'

describe('GameActionMenu', () => {
  it('keeps the menu open and updates sound feedback after toggling', () => {
    function StatefulMenu() {
      const [soundEnabled, setSoundEnabled] = React.useState(true)

      return (
        <GameActionMenu
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((previous) => !previous)}
          onRestart={() => undefined}
          onSwitchPuzzle={() => undefined}
          onBack={() => undefined}
        />
      )
    }

    render(<StatefulMenu />)

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '关闭音效' }))

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '开启音效' })).toBeInTheDocument()
    expect(screen.getByText('音效已关闭')).toBeInTheDocument()
  })

  it('calls closing actions from menu items', () => {
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
    fireEvent.click(screen.getByRole('menuitem', { name: '重新开始' }))
    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '换一局' }))
    expect(onSwitchPuzzle).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '菜单' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '返回首页' }))
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onToggleSound).not.toHaveBeenCalled()
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
    expect(screen.getByText('音效已关闭')).toBeInTheDocument()
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
