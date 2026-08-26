import * as Phaser from 'phaser'
import './phaser.css'
import { BattleScene } from './game/BattleScene'

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 576,
  parent: 'phaser-game',
  backgroundColor: '#081321',
  scene: [BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
}

const game = new Phaser.Game(config)
const gameRoot = document.querySelector<HTMLElement>('#phaser-game')

function isLandscapeViewport() {
  return window.innerWidth >= window.innerHeight
}

function refreshGameScale() {
  requestAnimationFrame(() => {
    game.scale.refresh()
  })
}

function syncOrientationFallback() {
  if (!document.body.classList.contains('entered')) return

  const useVirtualLandscape = !isLandscapeViewport()
  document.body.classList.toggle('virtual-landscape', useVirtualLandscape)
  refreshGameScale()
}

async function requestGameFullscreen() {
  if (document.fullscreenElement) return

  try {
    await gameRoot?.requestFullscreen()
    return
  } catch {
    // Some Android browsers reject fullscreen on the game element.
  }

  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // Fullscreen is optional. A rotated CSS fallback is used below.
  }
}

async function requestLandscapeLock() {
  const orientation = screen.orientation as LockableOrientation
  if (!orientation.lock) return

  try {
    await orientation.lock('landscape-primary')
    return
  } catch {
    // Some implementations only accept the generic landscape value.
  }

  try {
    await orientation.lock('landscape')
  } catch {
    // System portrait lock / browser policy may reject this.
  }
}

async function enterLandscape() {
  await requestGameFullscreen()
  await requestLandscapeLock()

  document.body.classList.add('entered')
  syncOrientationFallback()

  // Android browsers can resize one or two frames after orientation/fullscreen.
  window.setTimeout(syncOrientationFallback, 180)
  window.setTimeout(syncOrientationFallback, 500)
}

document.querySelector<HTMLButtonElement>('#launchPhaser')?.addEventListener('click', () => {
  void enterLandscape()
})

document.querySelector<HTMLButtonElement>('#backPrototype')?.addEventListener('click', () => {
  window.location.href = './'
})

window.addEventListener('resize', syncOrientationFallback)
window.addEventListener('orientationchange', syncOrientationFallback)
document.addEventListener('fullscreenchange', syncOrientationFallback)

window.addEventListener('beforeunload', () => {
  game.destroy(true)
})
