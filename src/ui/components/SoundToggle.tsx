import { Volume2, VolumeX } from 'lucide-react'

import { useSettingsStore } from '@/store/settings-store'

export function SoundToggle() {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled)
  const toggleSoundEnabled = useSettingsStore((state) => state.toggleSoundEnabled)

  return (
    <button
      type="button"
      onClick={toggleSoundEnabled}
      className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all hover:bg-primary hover:scale-110"
      aria-label={soundEnabled ? '关闭音效' : '开启音效'}
      title={soundEnabled ? '关闭音效' : '开启音效'}
    >
      {soundEnabled ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
    </button>
  )
}
