import './orientation.css'

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>
  unlock?: () => void
}

const orientation = screen.orientation as LockableOrientation

async function enterLandscape() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen()
    }
  } catch {
    // Fullscreen support varies by browser; orientation lock may still work in standalone mode.
  }

  try {
    await orientation.lock?.('landscape')
  } catch {
    // Browser tabs may reject orientation lock; installed PWA/standalone usually behaves better.
  }
}

async function leaveFullscreen() {
  try {
    orientation.unlock?.()
  } catch {
    // Ignore unsupported unlock calls.
  }

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen()
    } catch {
      // Ignore unsupported exit calls.
    }
  }
}

document.addEventListener('click', event => {
  const target = event.target as Element | null
  if (!target) return

  const portraitGate = target.closest('.portrait-gate')
  const fullscreenButton = target.closest('#fullscreenBtn')

  if (portraitGate) {
    event.preventDefault()
    event.stopImmediatePropagation()
    void enterLandscape()
    return
  }

  if (fullscreenButton) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (document.fullscreenElement) void leaveFullscreen()
    else void enterLandscape()
  }
}, true)

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('./sw.js')
  }
})
