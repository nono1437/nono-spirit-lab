export type ElementType = '冰' | '钢' | '无'
export type SkillKind = '物理' | '魔法' | '辅助' | '绝招'
export type StatusId = 'taunt' | 'seal'
export type FormId = 'default' | 'overdrive'

export type Skill = {
  id: string
  name: string
  element: ElementType
  kind: SkillKind
  power?: number
  priority?: number
  maxPp: number
  critBonus?: number
  critDamageBonus?: number
  healPercent?: number
  cleanseCount?: number
  applies?: StatusId[]
  transformBeforeHit?: boolean
}

export type Fighter = {
  name: string
  maxHp: number
  hp: number
  attack: number
  magic: number
  defense: number
  magicDefense: number
  speed: number
  form: FormId
  statuses: Array<{ id: StatusId; turns: number }>
}

export type BattleState = {
  turn: number
  player: Fighter
  enemy: Fighter
  pp: Record<string, number>
  log: string[]
  forceCrit: boolean
}

export const BASIC_SKILLS: Skill[] = [
  {
    id: 'frostEdge',
    name: '寒锋',
    element: '冰',
    kind: '物理',
    power: 75,
    maxPp: 10,
    critBonus: 0.5,
    critDamageBonus: 0.5,
  },
  {
    id: 'windArc',
    name: '风弧',
    element: '钢',
    kind: '魔法',
    power: 75,
    maxPp: 10,
    critBonus: 0.5,
    critDamageBonus: 0.5,
  },
  {
    id: 'lockField',
    name: '禁制场',
    element: '钢',
    kind: '辅助',
    maxPp: 5,
    applies: ['taunt', 'seal'],
  },
  {
    id: 'renew',
    name: '复苏',
    element: '冰',
    kind: '辅助',
    maxPp: 3,
    healPercent: 0.3,
    cleanseCount: 1,
  },
]

export const ULTIMATE_DEFAULT: Skill = {
  id: 'overdrivePulse',
  name: '超载脉冲',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  critBonus: 0.5,
  transformBeforeHit: true,
}

export const ULTIMATE_OVERDRIVE: Skill = {
  id: 'finalRush',
  name: '终幕突进',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  critBonus: 0.5,
}

export const ALL_SKILLS = [...BASIC_SKILLS, ULTIMATE_DEFAULT, ULTIMATE_OVERDRIVE]

const initialPp = () => Object.fromEntries(ALL_SKILLS.map(skill => [skill.id, skill.maxPp]))
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export class BattleEngine {
  state: BattleState

  constructor() {
    this.state = this.makeState()
  }

  reset() {
    this.state = this.makeState()
  }

  currentUltimate() {
    return this.state.player.form === 'overdrive' ? ULTIMATE_OVERDRIVE : ULTIMATE_DEFAULT
  }

  skillById(id: string) {
    return ALL_SKILLS.find(skill => skill.id === id)
  }

  useSkill(id: string) {
    const skill = this.skillById(id)
    if (!skill || this.state.player.hp <= 0 || this.state.enemy.hp <= 0) return false

    const pp = this.state.pp[id] ?? 0
    if (pp <= 0) {
      this.addLog(`${skill.name} 的 PP 已耗尽。`)
      return false
    }

    this.state.pp[id] = pp - 1
    this.addLog(`我方使用「${skill.name}」。`)

    if (skill.transformBeforeHit) this.transform('overdrive')

    if (skill.cleanseCount) {
      const removed = this.state.player.statuses.splice(0, skill.cleanseCount)
      if (removed.length) this.addLog(`驱散 ${removed.length} 个不利状态。`)
    }

    if (skill.healPercent) {
      const before = this.state.player.hp
      this.state.player.hp = Math.min(
        this.state.player.maxHp,
        this.state.player.hp + this.state.player.maxHp * skill.healPercent,
      )
      this.addLog(`恢复 ${Math.round(this.state.player.hp - before)} 点生命。`)
    }

    if (skill.applies) {
      skill.applies.forEach(status => this.setStatus(this.state.enemy, status, 2))
      this.addLog('训练核心获得挑衅与封印（2回合）。')
    }

    if (skill.power) {
      const crit = this.rollCrit(skill)
      const damage = this.calculateDamage(skill, crit)
      this.state.enemy.hp = Math.max(0, this.state.enemy.hp - damage)
      this.addLog(`${crit ? '暴击！' : ''}造成 ${damage} 点伤害。`)
    }

    if (this.state.enemy.hp <= 0) {
      this.addLog('训练核心失去战斗能力。')
      return true
    }

    this.enemyHit(1)
    this.tickStatuses(this.state.enemy)
    this.state.turn += 1
    return true
  }

  enemyHit(times = 1) {
    for (let i = 0; i < times && this.state.player.hp > 0; i += 1) {
      const damage = Math.max(1, Math.round(48 + Math.random() * 24))
      this.state.player.hp = Math.max(0, this.state.player.hp - damage)
      this.addLog(`训练核心造成 ${damage} 点伤害。`)

      if (this.state.player.form === 'default' && this.state.player.hp > 0) {
        const heal = Math.round(this.state.player.maxHp * 0.06)
        const before = this.state.player.hp
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + heal)
        this.addLog(`回响触发：恢复 ${this.state.player.hp - before} 点生命。`)
      }
    }

    if (this.state.player.hp <= 0) this.addLog('我方失去战斗能力。')
  }

  transform(force?: FormId) {
    const next = force ?? (this.state.player.form === 'default' ? 'overdrive' : 'default')
    if (next === this.state.player.form) return
    this.state.player.form = next

    if (next === 'overdrive') {
      Object.assign(this.state.player, {
        attack: 421,
        magic: 417,
        defense: 218,
        magicDefense: 210,
      })
      this.addLog('✦ 试作体进入超载形态。')
    } else {
      Object.assign(this.state.player, {
        attack: 382,
        magic: 379,
        defense: 245,
        magicDefense: 234,
      })
      this.addLog('试作体恢复基础形态。')
    }
  }

  restoreAll() {
    this.state.player.hp = this.state.player.maxHp
    this.state.enemy.hp = this.state.enemy.maxHp
    this.state.pp = initialPp()
    this.addLog('Lab：生命与 PP 已恢复。')
  }

  setForceCrit() {
    this.state.forceCrit = true
    this.addLog('Lab：下一次攻击强制暴击。')
  }

  private makeState(): BattleState {
    return {
      turn: 1,
      player: {
        name: '霜曜试作体',
        maxHp: 659,
        hp: 659,
        attack: 382,
        magic: 379,
        defense: 245,
        magicDefense: 234,
        speed: 245,
        form: 'default',
        statuses: [],
      },
      enemy: {
        name: '训练核心',
        maxHp: 900,
        hp: 900,
        attack: 290,
        magic: 250,
        defense: 255,
        magicDefense: 250,
        speed: 180,
        form: 'default',
        statuses: [],
      },
      pp: initialPp(),
      log: ['Phaser 训练场连接完成。'],
      forceCrit: false,
    }
  }

  private calculateDamage(skill: Skill, crit: boolean) {
    const offensive = skill.kind === '物理' ? this.state.player.attack : this.state.player.magic
    const defensive = skill.kind === '物理' ? this.state.enemy.defense : this.state.enemy.magicDefense
    const base = ((skill.power ?? 0) * offensive) / Math.max(120, defensive + 130)
    const variance = 0.92 + Math.random() * 0.16
    const critMultiplier = crit ? 1.5 + (skill.critDamageBonus ?? 0) : 1
    return Math.max(1, Math.round(base * variance * critMultiplier))
  }

  private rollCrit(skill: Skill) {
    const passive = this.state.player.form === 'overdrive' ? 0.5 : 0
    const chance = clamp(0.08 + (skill.critBonus ?? 0) + passive, 0, 1)
    if (this.state.forceCrit) {
      this.state.forceCrit = false
      return true
    }
    return Math.random() < chance
  }

  private setStatus(target: Fighter, id: StatusId, turns: number) {
    const existing = target.statuses.find(status => status.id === id)
    if (existing) existing.turns = Math.max(existing.turns, turns)
    else target.statuses.push({ id, turns })
  }

  private tickStatuses(target: Fighter) {
    target.statuses.forEach(status => {
      status.turns -= 1
    })
    target.statuses = target.statuses.filter(status => status.turns > 0)
  }

  private addLog(line: string) {
    this.state.log.push(line)
    if (this.state.log.length > 80) this.state.log.shift()
  }
}
