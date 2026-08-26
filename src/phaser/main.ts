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

async function enterLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
  } catch {
    // Fullscreen is optional; continue to orientation attempt.
  }

  try {
    const orientation = screen.orientation as LockableOrientation
    if (orientation.lock) await orientation.lock('landscape')
  } catch {
    // Browsers may reject orientation lock; manual rotation still works.
  }

  document.body.classList.add('entered')
}

document.querySelector<HTMLButtonElement>('#launchPhaser')?.addEventListener('click', () => {
  void enterLandscape()
})

document.querySelector<HTMLButtonElement>('#backPrototype')?.addEventListener('click', () => {
  window.location.href = './'
})

window.addEventListener('beforeunload', () => {
  game.destroy(true)
})
