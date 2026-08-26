import * as Phaser from 'phaser'
import { BASIC_SKILLS, BattleEngine, type Skill } from './BattleEngine'
import {
  atlasRects,
  emberFrameKeys,
  emberFrameMotion,
  emberFrames,
  privateArena,
  privateAssetModeEnabled,
  privateAssetUrl,
  privateVfx,
} from '../privateAssets'

const WIDTH = 1024
const HEIGHT = 576
const PRIVATE_PLAYER_SIZE = 300

export class BattleScene extends Phaser.Scene {
  private engine = new BattleEngine()
  private playerHpBar!: Phaser.GameObjects.Graphics
  private enemyHpBar!: Phaser.GameObjects.Graphics
  private playerHpText!: Phaser.GameObjects.Text
  private enemyHpText!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private toastText!: Phaser.GameObjects.Text
  private statusText!: Phaser.GameObjects.Text
  private playerUnit!: Phaser.GameObjects.Container
  private enemyUnit!: Phaser.GameObjects.Container
  private ultimateLabel!: Phaser.GameObjects.Text
  private ultimatePp!: Phaser.GameObjects.Text
  private ppTexts = new Map<string, Phaser.GameObjects.Text>()

  private readonly privateMode = privateAssetModeEnabled()
  private privateAssetsReady = false
  private privatePlayerSprite?: Phaser.GameObjects.Image
  private privateCurrentFrame = 0
  private privateFrameHistory: number[] = []
  private privateVfxCursor = 0

  constructor() {
    super('BattleScene')
  }

  preload() {
    if (!this.privateMode) return

    this.load.image('private-dream-arena', privateAssetUrl(privateArena))
    emberFrames.forEach((file, index) => {
      this.load.image(emberFrameKeys[index], privateAssetUrl(file))
    })
    this.load.image('private-vfx-slash', privateAssetUrl(privateVfx.slash))
    this.load.image('private-vfx-impact', privateAssetUrl(privateVfx.impact))
    this.load.image('private-vfx-magic', privateAssetUrl(privateVfx.magic))
  }

  create() {
    this.privateAssetsReady = this.privateMode && this.textures.exists(emberFrameKeys[0])
    if (this.privateAssetsReady) this.engine.state.player.name = '炎羽凰姬'

    this.drawArena()
    this.drawHud()
    this.playerUnit = this.makePlayerUnit(270, 286)
    this.enemyUnit = this.makeEnemyUnit(755, 282)
    this.drawControls()
    this.refresh()

    if (this.privateMode && !this.privateAssetsReady) {
      this.showToast('私有素材模式已开启，但本机素材包未注入；已回退占位角色。')
    }
  }

  private drawArena() {
    this.cameras.main.setBackgroundColor('#081321')

    if (this.privateAssetsReady && this.textures.exists('private-dream-arena')) {
      this.add.image(WIDTH / 2, HEIGHT / 2, 'private-dream-arena')
        .setDisplaySize(WIDTH, HEIGHT)
        .setDepth(-20)
      this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x07101d, 0.22).setDepth(-19)
      return
    }

    const bg = this.add.graphics()
    bg.fillGradientStyle(0x102541, 0x102541, 0x24153f, 0x24153f, 1)
    bg.fillRect(0, 0, WIDTH, HEIGHT)
    bg.fillStyle(0x17395d, 0.24)
    bg.fillCircle(170, 90, 260)
    bg.fillStyle(0x632a86, 0.18)
    bg.fillCircle(870, 130, 280)

    const arena = this.add.graphics()
    arena.fillStyle(0x12283d, 0.68)
    arena.fillEllipse(WIDTH / 2, 330, 560, 136)
    arena.lineStyle(4, 0x6ebee8, 0.32)
    arena.strokeEllipse(WIDTH / 2, 318, 720, 220)
    arena.lineStyle(2, 0xffffff, 0.12)
    arena.strokeEllipse(WIDTH / 2, 320, 520, 150)

    this.add.text(WIDTH / 2, 302, '✦', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '58px',
      color: '#79e6ff',
    }).setOrigin(0.5).setAlpha(0.3)
  }

  private drawHud() {
    this.add.text(24, 16, 'NONO SPIRIT LAB', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#70e9ff',
    })
    this.add.text(24, 39, this.privateAssetsReady ? 'Phaser · private crossover build' : 'Phaser Foundation · v0.3 preview', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#7188a5',
    })

    this.roundText = this.add.text(WIDTH / 2, 18, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5, 0)

    this.add.text(48, 82, '我方 · Lv.100', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#70e9ff',
    })
    this.add.text(48, 104, this.engine.state.player.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    })
    this.playerHpBar = this.add.graphics()
    this.playerHpText = this.add.text(48, 151, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#dcecff',
    })

    this.add.text(976, 82, '训练目标 · Lv.100', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#ffb9dc',
    }).setOrigin(1, 0)
    this.add.text(976, 104, this.engine.state.enemy.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(1, 0)
    this.enemyHpBar = this.add.graphics()
    this.enemyHpText = this.add.text(976, 151, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#dcecff',
    }).setOrigin(1, 0)
    this.statusText = this.add.text(976, 172, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#f6d7ff',
    }).setOrigin(1, 0)

    this.toastText = this.add.text(WIDTH / 2, 400, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#eaf8ff',
      backgroundColor: '#07111fcc',
      padding: { x: 16, y: 7 },
    }).setOrigin(0.5).setDepth(8)
  }

  private drawControls() {
    const startX = 202
    const gap = 158
    BASIC_SKILLS.forEach((skill, index) => {
      this.makeSkillButton(startX + index * gap, 494, 146, 66, skill, index + 1)
    })

    const ultimate = this.add.container(914, 493).setDepth(7)
    const circle = this.add.circle(0, 0, 48, 0x503165, 0.96)
      .setStrokeStyle(3, 0xffd88a, 0.9)
      .setInteractive({ useHandCursor: true })
    const inner = this.add.circle(0, 0, 38, 0x9b5a31, 0.26)
      .setStrokeStyle(1, 0xffffff, 0.22)
    const glyph = this.add.text(0, -15, '✦', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '27px',
      color: '#fff2ba',
    }).setOrigin(0.5)
    this.ultimateLabel = this.add.text(0, 12, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5)
    this.ultimatePp = this.add.text(0, 31, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '10px',
      color: '#efcf9e',
    }).setOrigin(0.5)
    ultimate.add([circle, inner, glyph, this.ultimateLabel, this.ultimatePp])
    circle.on('pointerdown', () => this.performSkill(this.engine.currentUltimate()))

    this.makeUtilityButton(35, 470, '⇄ 换宠', () => this.showToast('当前预览暂无备用精灵'))
    this.makeUtilityButton(35, 508, '🧪 恢复', () => {
      this.engine.restoreAll()
      if (this.privateAssetsReady) this.setPrivateFrame(0, false)
      this.refresh()
    })
    this.makeUtilityButton(35, 546, '✦ 暴击', () => {
      this.engine.setForceCrit()
      this.refresh()
    })
  }

  private makeSkillButton(x: number, y: number, width: number, height: number, skill: Skill, index: number) {
    const root = this.add.container(x, y).setDepth(7)
    const color = skill.element === '冰' ? 0x133c58 : 0x27304f
    const edge = skill.kind === '辅助' ? 0xbc8cda : 0x5bcfff
    const bg = this.add.rectangle(0, 0, width, height, color, 0.96)
      .setStrokeStyle(2, edge, 0.65)
      .setInteractive({ useHandCursor: true })

    const number = this.add.text(-width / 2 + 12, -height / 2 + 8, `${index}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#7f9cb9',
    })
    const label = this.add.text(-width / 2 + 31, -18, skill.name, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#ffffff',
    })
    const meta = this.add.text(-width / 2 + 31, 7, `${skill.element} · ${skill.kind}${skill.power ? ` · ${skill.power}` : ''}`, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#9ab2ca',
    })
    const pp = this.add.text(width / 2 - 11, 22, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      color: '#a9dfff',
    }).setOrigin(1, 0.5)

    this.ppTexts.set(skill.id, pp)
    root.add([bg, number, label, meta, pp])
    bg.on('pointerover', () => root.setScale(1.025))
    bg.on('pointerout', () => root.setScale(1))
    bg.on('pointerdown', () => this.performSkill(skill))
  }

  private makeUtilityButton(x: number, y: number, label: string, action: () => void) {
    const bg = this.add.rectangle(x + 55, y, 110, 30, 0x14233a, 0.92)
      .setStrokeStyle(1, 0x6d91bb, 0.42)
      .setInteractive({ useHandCursor: true })
      .setDepth(7)
    const text = this.add.text(x + 55, y, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#d9ecff',
    }).setOrigin(0.5).setDepth(8)
    bg.on('pointerdown', action)
    bg.on('pointerover', () => text.setColor('#ffffff'))
    bg.on('pointerout', () => text.setColor('#d9ecff'))
  }

  private performSkill(skill: Skill) {
    if (this.engine.state.enemy.hp <= 0 || this.engine.state.player.hp <= 0) return

    const beforeEnemyHp = this.engine.state.enemy.hp
    const beforePlayerHp = this.engine.state.player.hp
    const worked = this.engine.useSkill(skill.id)
    if (!worked) {
      this.refresh()
      return
    }

    if (this.privateAssetsReady) this.playPrivateAction(skill)

    if (beforeEnemyHp > this.engine.state.enemy.hp) {
      if (!this.privateAssetsReady) {
        this.tweens.add({
          targets: this.playerUnit,
          x: '+=72',
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
        })
      }
      this.tweens.add({ targets: this.enemyUnit, alpha: 0.28, duration: 70, yoyo: true, repeat: 1 })
      this.cameras.main.shake(skill.kind === '绝招' ? 180 : 110, skill.kind === '绝招' ? 0.007 : 0.004)
    }

    if (beforePlayerHp > this.engine.state.player.hp) {
      this.tweens.add({ targets: this.playerUnit, alpha: 0.5, duration: 70, yoyo: true })
    }

    if (skill.transformBeforeHit && !this.privateAssetsReady) {
      this.tweens.add({ targets: this.playerUnit, scale: 1.16, duration: 160, yoyo: true })
    }

    this.refresh()
  }

  private refresh() {
    const { player, enemy, turn, pp, log } = this.engine.state
    this.roundText.setText(`回合 ${turn}`)
    this.playerHpText.setText(`${Math.round(player.hp)} / ${player.maxHp}`)
    this.enemyHpText.setText(`${Math.round(enemy.hp)} / ${enemy.maxHp}`)
    this.toastText.setText(log.at(-1) ?? '等待操作')
    this.statusText.setText(
      enemy.statuses.length
        ? enemy.statuses.map(status => `${status.id === 'taunt' ? '挑衅' : '封印'} ${status.turns}`).join('  ·  ')
        : '无异常状态',
    )

    this.drawHpBar(this.playerHpBar, 48, 136, 325, player.hp / player.maxHp)
    this.drawHpBar(this.enemyHpBar, 651, 136, 325, enemy.hp / enemy.maxHp)

    BASIC_SKILLS.forEach(skill => {
      this.ppTexts.get(skill.id)?.setText(`PP ${pp[skill.id]}/${skill.maxPp}`)
    })

    const ultimate = this.engine.currentUltimate()
    this.ultimateLabel.setText(ultimate.name)
    this.ultimatePp.setText(`PP ${pp[ultimate.id]}/${ultimate.maxPp}`)
    if (!this.privateAssetsReady) this.playerUnit?.setScale(player.form === 'overdrive' ? 1.08 : 1)
  }

  private drawHpBar(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, ratio: number) {
    graphics.clear()
    graphics.fillStyle(0x020711, 0.86)
    graphics.fillRoundedRect(x, y, width, 12, 6)
    graphics.fillStyle(0x67e987, 1)
    graphics.fillRoundedRect(x + 2, y + 2, Math.max(0, (width - 4) * Phaser.Math.Clamp(ratio, 0, 1)), 8, 4)
  }

  private makePlayerUnit(x: number, y: number) {
    const root = this.add.container(x, y).setDepth(3)

    if (this.privateAssetsReady) {
      const ground = this.add.ellipse(0, 105, 205, 34, 0xffa43a, 0.07).setStrokeStyle(2, 0xffd36d, 0.32)
      this.privatePlayerSprite = this.add.image(0, 0, emberFrameKeys[0]).setDisplaySize(PRIVATE_PLAYER_SIZE, PRIVATE_PLAYER_SIZE)
      root.add([ground, this.privatePlayerSprite])
      this.privateFrameHistory = [0]
      this.tweens.add({ targets: root, y: y - 4, duration: 1450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      return root
    }

    const aura = this.add.circle(0, 0, 88, 0x7beeff, 0.05).setStrokeStyle(2, 0xb488ff, 0.45)
    const aura2 = this.add.circle(0, 0, 63, 0x7338b0, 0.08).setStrokeStyle(1, 0x62ddff, 0.6)
    const left = this.add.rectangle(-38, 0, 24, 122, 0x74e7ff, 0.92).setRotation(-0.22)
    const right = this.add.rectangle(38, 0, 24, 122, 0xb06dff, 0.92).setRotation(0.22)
    const core = this.add.star(0, 0, 8, 20, 44, 0xffffff, 1).setStrokeStyle(3, 0x9b69ff, 0.8)
    const mark = this.add.text(0, 0, '✦', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
      color: '#7feeff',
    }).setOrigin(0.5)
    const ground = this.add.ellipse(0, 95, 190, 34, 0x78c8ff, 0.05).setStrokeStyle(2, 0x78c8ff, 0.32)
    root.add([aura, aura2, ground, left, right, core, mark])

    this.tweens.add({ targets: [aura, aura2], scale: 1.08, alpha: 0.55, duration: 1300, yoyo: true, repeat: -1 })
    this.tweens.add({ targets: root, y: y - 7, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return root
  }

  private makeEnemyUnit(x: number, y: number) {
    const root = this.add.container(x, y).setDepth(3)
    const glow = this.add.circle(0, 0, 72, 0xd76fff, 0.1)
    const orb = this.add.circle(0, 0, 58, 0x6a4b94, 1).setStrokeStyle(3, 0xffbb69, 0.58)
    const shine = this.add.circle(-20, -22, 17, 0xffdf7d, 0.9)
    const eye1 = this.add.ellipse(-17, 3, 11, 24, 0x0b1422, 1)
    const eye2 = this.add.ellipse(17, 3, 11, 24, 0x0b1422, 1)
    const mouth = this.add.rectangle(0, 26, 36, 5, 0x0b1422, 1)
    const ground = this.add.ellipse(0, 86, 170, 28, 0x9d74ff, 0.05).setStrokeStyle(2, 0x9d74ff, 0.28)
    root.add([glow, ground, orb, shine, eye1, eye2, mouth])
    this.tweens.add({ targets: root, y: y + 8, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    return root
  }

  private playPrivateAction(skill: Skill) {
    const frame = this.privateFrameForSkill(skill)
    this.spawnPrivateAfterimages()
    this.setPrivateFrame(frame, true)

    if (skill.power) {
      this.spawnPrivateVfx('slash', 760, 290, skill.kind === '绝招' ? 1.15 : 0.88)
      this.time.delayedCall(70, () => this.spawnPrivateVfx('impact', 760, 290, skill.kind === '绝招' ? 0.9 : 0.62))
    }
    if (skill.kind === '辅助' || skill.kind === '魔法' || skill.kind === '绝招') {
      this.spawnPrivateVfx('magic', skill.kind === '辅助' ? 285 : 650, 300, skill.kind === '绝招' ? 1.0 : 0.58)
    }
  }

  private privateFrameForSkill(skill: Skill) {
    if (skill.id === 'frostEdge') return 3
    if (skill.id === 'windArc') return 4
    if (skill.id === 'lockField') return 5
    if (skill.id === 'renew') return 6
    if (skill.id === 'overdrivePulse') return 6
    if (skill.id === 'finalRush') return 7
    return (this.privateCurrentFrame + 1) % emberFrameKeys.length
  }

  private setPrivateFrame(frameIndex: number, keepHistory = true) {
    if (!this.privatePlayerSprite) return
    const safeIndex = Phaser.Math.Clamp(frameIndex, 0, emberFrameKeys.length - 1)
    const motion = emberFrameMotion[safeIndex]
    this.privateCurrentFrame = safeIndex
    this.privatePlayerSprite.setTexture(emberFrameKeys[safeIndex])
    this.privatePlayerSprite.setPosition(motion.dx, motion.dy)
    this.privatePlayerSprite.setRotation(motion.rotation)
    this.privatePlayerSprite.setDisplaySize(PRIVATE_PLAYER_SIZE * motion.scale, PRIVATE_PLAYER_SIZE * motion.scale)

    if (keepHistory) {
      this.privateFrameHistory.push(safeIndex)
      if (this.privateFrameHistory.length > 4) this.privateFrameHistory.shift()
    } else {
      this.privateFrameHistory = [safeIndex]
    }
  }

  private spawnPrivateAfterimages() {
    const recent = this.privateFrameHistory.slice(-2)
    recent.forEach((frameIndex, order) => {
      const motion = emberFrameMotion[frameIndex]
      const ghost = this.add.image(
        this.playerUnit.x + motion.dx - (recent.length - order) * 7,
        this.playerUnit.y + motion.dy,
        emberFrameKeys[frameIndex],
      )
        .setDisplaySize(PRIVATE_PLAYER_SIZE * motion.scale, PRIVATE_PLAYER_SIZE * motion.scale)
        .setRotation(motion.rotation)
        .setAlpha(order === recent.length - 1 ? 0.22 : 0.12)
        .setDepth(2)

      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 390,
        ease: 'Linear',
        onComplete: () => ghost.destroy(),
      })
    })
  }

  private spawnPrivateVfx(kind: keyof typeof atlasRects, x: number, y: number, scale: number) {
    const textureKey = `private-vfx-${kind}`
    if (!this.textures.exists(textureKey)) return

    const rects = atlasRects[kind]
    const rect = rects[this.privateVfxCursor % rects.length]
    this.privateVfxCursor += 1
    const [sourceX, sourceY, sourceWidth, sourceHeight] = rect
    const aspect = sourceWidth / sourceHeight
    const displayHeight = 190 * scale
    const displayWidth = displayHeight * aspect

    const vfx = this.add.image(x, y, textureKey)
      .setCrop(sourceX, sourceY, sourceWidth, sourceHeight)
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(kind === 'magic' ? 0.58 : 0.78)
      .setDepth(5)

    this.tweens.add({
      targets: vfx,
      alpha: 0,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: kind === 'magic' ? 430 : 290,
      ease: 'Quad.easeOut',
      onComplete: () => vfx.destroy(),
    })
  }

  private showToast(message: string) {
    this.toastText.setText(message)
  }
}
