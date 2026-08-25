import './style.css'

type ElementType = '冰' | '钢' | '无'
type SkillKind = '物理' | '魔法' | '辅助' | '绝招'
type StatusId = 'taunt' | 'seal'
type FormId = 'default' | 'overdrive'

type StatusState = {
  id: StatusId
  turns: number
}

type Skill = {
  id: string
  name: string
  element: ElementType
  kind: SkillKind
  power?: number
  priority?: number
  maxPp: number
  description: string
  critBonus?: number
  critDamageBonus?: number
  healPercent?: number
  cleanseCount?: number
  applies?: StatusId[]
  transformBeforeHit?: boolean
}

type Fighter = {
  name: string
  maxHp: number
  hp: number
  attack: number
  magic: number
  defense: number
  magicDefense: number
  speed: number
  form: FormId
  statuses: StatusState[]
}

type BattleState = {
  turn: number
  player: Fighter
  enemy: Fighter
  pp: Record<string, number>
  log: string[]
  locked: boolean
  forceCrit: boolean
}

const VERSION = 'v0.1.1 · alpha'

const baseSkills: Skill[] = [
  {
    id: 'frostEdge',
    name: '寒锋',
    element: '冰',
    kind: '物理',
    power: 75,
    maxPp: 10,
    description: '威力75 · 物理攻击 · 暴击率与暴击伤害提高',
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
    description: '威力75 · 魔法攻击 · 暴击率与暴击伤害提高',
    critBonus: 0.5,
    critDamageBonus: 0.5,
  },
  {
    id: 'lockField',
    name: '禁制场',
    element: '钢',
    kind: '辅助',
    maxPp: 5,
    description: '对目标附加挑衅与封印2回合',
    applies: ['taunt', 'seal'],
  },
  {
    id: 'renew',
    name: '复苏',
    element: '冰',
    kind: '辅助',
    maxPp: 3,
    description: '驱散自身1个不利状态，并回复30%最大生命',
    healPercent: 0.3,
    cleanseCount: 1,
  },
]

const ultimateDefault: Skill = {
  id: 'overdrivePulse',
  name: '超载脉冲',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  description: '先手+1 · 特殊攻击 · 暴击率提高 · 先进入超载形态再攻击',
  critBonus: 0.5,
  transformBeforeHit: true,
}

const ultimateOverdrive: Skill = {
  id: 'finalRush',
  name: '终幕突进',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  description: '超载形态绝招 · 先手+1 · 特殊攻击 · 暴击率提高',
  critBonus: 0.5,
}

const statusMeta: Record<StatusId, { name: string; description: string }> = {
  taunt: { name: '挑衅', description: '无法使用辅助技能' },
  seal: { name: '封印', description: '无法切换精灵' },
}

const allSkills = [...baseSkills, ultimateDefault, ultimateOverdrive]

const initialPp = () => Object.fromEntries(allSkills.map(skill => [skill.id, skill.maxPp]))

const makeState = (): BattleState => ({
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
  log: ['训练场连接完成。试作体进入战斗。'],
  locked: false,
  forceCrit: false,
})

let state = makeState()
const app = document.querySelector<HTMLDivElement>('#app')!

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function currentUltimate() {
  return state.player.form === 'overdrive' ? ultimateOverdrive : ultimateDefault
}

function hpPercent(fighter: Fighter) {
  return clamp((fighter.hp / fighter.maxHp) * 100, 0, 100)
}

function formLabel() {
  return state.player.form === 'overdrive' ? '超载形态' : '基础形态'
}

function passiveLabel() {
  return state.player.form === 'overdrive'
    ? '突破：暴击率 +50%'
    : '回响：每次受到伤害后恢复 6% 最大生命'
}

function statusChip(status: StatusState) {
  const meta = statusMeta[status.id]
  return `<span class="status-chip" title="${meta.description}">${meta.name}<b>${status.turns}</b></span>`
}

function skillButton(skill: Skill, index: number) {
  const pp = state.pp[skill.id] ?? 0
  const elementClass = skill.element === '冰' ? 'ice' : skill.element === '钢' ? 'steel' : 'neutral'
  const disabled = state.locked || pp <= 0 || state.player.hp <= 0 || state.enemy.hp <= 0
  return `
    <button class="skill-card ${elementClass} ${skill.kind === '绝招' ? 'ultimate-card' : ''}" data-skill="${skill.id}" ${disabled ? 'disabled' : ''}>
      <span class="skill-index">${index}</span>
      <span class="skill-main">
        <strong>${skill.name}</strong>
        <small>${skill.element} · ${skill.kind}${skill.power ? ` · 威力 ${skill.power}` : ''}</small>
      </span>
      <span class="pp">PP ${pp}/${skill.maxPp}</span>
    </button>
  `
}

function render() {
  const enemyStatuses = state.enemy.statuses.length
    ? state.enemy.statuses.map(statusChip).join('')
    : '<span class="status-empty">无异常状态</span>'

  app.innerHTML = `
    <main class="game-shell">
      <header class="topbar">
        <div>
          <span class="eyebrow">nono Spirit Lab</span>
          <h1>精灵训练场</h1>
        </div>
        <div class="top-actions">
          <span class="turn">回合 ${state.turn}</span>
          <button class="ghost" id="resetBtn">重置</button>
        </div>
      </header>

      <section class="arena">
        <article class="fighter player ${state.player.form === 'overdrive' ? 'war' : ''}">
          <div class="fighter-head">
            <div>
              <span class="side-label">我方</span>
              <h2>${state.player.name}</h2>
              <p>${formLabel()} · ${passiveLabel()}</p>
            </div>
            <span class="level">Lv.100</span>
          </div>
          <div class="hp-row">
            <div class="hp-track"><i style="width:${hpPercent(state.player)}%"></i></div>
            <span>${Math.max(0, Math.round(state.player.hp))} / ${state.player.maxHp}</span>
          </div>
          <div class="spirit-stage player-stage">
            <div class="aura aura-one"></div>
            <div class="aura aura-two"></div>
            <div class="spirit-avatar star-king">
              <span class="blade blade-left"></span>
              <span class="core">✦</span>
              <span class="blade blade-right"></span>
            </div>
            <div class="ground-ring"></div>
          </div>
          <div class="stats-line">
            <span>物攻 ${state.player.attack}</span><span>魔攻 ${state.player.magic}</span><span>速度 ${state.player.speed}</span>
          </div>
        </article>

        <div class="versus"><span>VS</span><small>TRAINING</small></div>

        <article class="fighter enemy">
          <div class="fighter-head enemy-head">
            <span class="level">Lv.100</span>
            <div>
              <span class="side-label">训练目标</span>
              <h2>${state.enemy.name}</h2>
              <p>高耐久测试单位 · 自动反击</p>
            </div>
          </div>
          <div class="hp-row enemy-hp">
            <span>${Math.max(0, Math.round(state.enemy.hp))} / ${state.enemy.maxHp}</span>
            <div class="hp-track"><i style="width:${hpPercent(state.enemy)}%"></i></div>
          </div>
          <div class="spirit-stage enemy-stage">
            <div class="dummy-orb"><span></span></div>
            <div class="ground-ring"></div>
          </div>
          <div class="enemy-status">${enemyStatuses}</div>
        </article>
      </section>

      <section class="control-panel">
        <div class="skill-panel">
          <div class="panel-title">
            <div><span class="eyebrow">本回合操作</span><h3>选择技能</h3></div>
            <span class="hint">4技能 + 1绝招 · 训练核心会自动反击</span>
          </div>
          <div class="skills-grid">
            ${baseSkills.map((skill, index) => skillButton(skill, index + 1)).join('')}
          </div>
          <div class="ultimate-wrap">${skillButton(currentUltimate(), 5)}</div>
        </div>

        <aside class="side-panel">
          <details open>
            <summary>🧪 nono Lab</summary>
            <div class="lab-grid">
              <button data-lab="heal">双方满血</button>
              <button data-lab="pp">恢复 PP</button>
              <button data-lab="crit">${state.forceCrit ? '关闭强制暴击' : '强制下次暴击'}</button>
              <button data-lab="transform">切换形态</button>
              <button data-lab="hit1">敌方攻击 1 次</button>
              <button data-lab="hit5">敌方连续攻击 5 次</button>
              <button data-lab="status">给敌方挑衅+封印</button>
              <button data-lab="support">测试敌方辅助技</button>
              <button data-lab="switch">测试敌方换宠</button>
            </div>
          </details>

          <div class="log-card">
            <div class="log-head"><strong>战斗日志</strong><button id="clearLog">清空</button></div>
            <div class="log-list">${state.log.slice(-8).reverse().map(line => `<p>${line}</p>`).join('')}</div>
          </div>
        </aside>
      </section>

      <footer><span>${VERSION}</span><span>Original prototype · mobile first</span></footer>
    </main>
  `

  bindEvents()
}

function addLog(text: string) {
  state.log.push(text)
  if (state.log.length > 80) state.log.shift()
}

function setStatus(target: Fighter, id: StatusId, turns: number) {
  const existing = target.statuses.find(status => status.id === id)
  if (existing) existing.turns = Math.max(existing.turns, turns)
  else target.statuses.push({ id, turns })
}

function tickStatuses(target: Fighter) {
  target.statuses.forEach(status => status.turns -= 1)
  target.statuses = target.statuses.filter(status => status.turns > 0)
}

function hasStatus(target: Fighter, id: StatusId) {
  return target.statuses.some(status => status.id === id && status.turns > 0)
}

function transformPlayer(force?: FormId) {
  const next = force ?? (state.player.form === 'default' ? 'overdrive' : 'default')
  if (next === state.player.form) return
  state.player.form = next

  if (next === 'overdrive') {
    state.player.attack = 421
    state.player.magic = 417
    state.player.defense = 218
    state.player.magicDefense = 210
    addLog('✦ 试作体进入超载形态，暴击能力提高。')
  } else {
    state.player.attack = 382
    state.player.magic = 379
    state.player.defense = 245
    state.player.magicDefense = 234
    addLog('试作体恢复基础形态。')
  }
}

function rollCrit(skill: Skill) {
  const baseCrit = 0.08
  const passive = state.player.form === 'overdrive' ? 0.5 : 0
  const chance = clamp(baseCrit + (skill.critBonus ?? 0) + passive, 0, 1)
  if (state.forceCrit) {
    state.forceCrit = false
    return true
  }
  return Math.random() < chance
}

function calculateDamage(skill: Skill, crit: boolean) {
  const offensive = skill.kind === '物理' ? state.player.attack : state.player.magic
  const defensive = skill.kind === '物理' ? state.enemy.defense : state.enemy.magicDefense
  const power = skill.power ?? 0
  const base = (power * offensive) / Math.max(120, defensive + 130)
  const variance = 0.92 + Math.random() * 0.16
  const critMultiplier = crit ? 1.5 + (skill.critDamageBonus ?? 0) : 1
  return Math.max(1, Math.round(base * variance * critMultiplier))
}

function enemyHit(times = 1) {
  if (state.player.hp <= 0) return
  for (let i = 0; i < times && state.player.hp > 0; i += 1) {
    const damage = Math.max(1, Math.round(48 + Math.random() * 24))
    state.player.hp = Math.max(0, state.player.hp - damage)
    addLog(`训练核心造成 ${damage} 点伤害。`)

    if (state.player.form === 'default' && state.player.hp > 0) {
      const heal = Math.round(state.player.maxHp * 0.06)
      const before = state.player.hp
      state.player.hp = Math.min(state.player.maxHp, state.player.hp + heal)
      addLog(`回响触发：恢复 ${state.player.hp - before} 点生命。`)
    }
  }
  if (state.player.hp <= 0) addLog('我方失去战斗能力。')
}

function playerUseSkill(skill: Skill) {
  if (state.locked || state.player.hp <= 0 || state.enemy.hp <= 0) return
  const pp = state.pp[skill.id] ?? 0
  if (pp <= 0) return

  state.locked = true
  state.pp[skill.id] = pp - 1
  addLog(`我方使用「${skill.name}」。`)

  if (skill.transformBeforeHit) transformPlayer('overdrive')

  if (skill.healPercent) {
    if (skill.cleanseCount && state.player.statuses.length) {
      const removed = state.player.statuses.splice(0, skill.cleanseCount)
      addLog(`驱散：${removed.map(item => statusMeta[item.id].name).join('、')}。`)
    }
    const before = state.player.hp
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + state.player.maxHp * skill.healPercent)
    addLog(`恢复 ${Math.round(state.player.hp - before)} 点生命。`)
  }

  if (skill.applies) {
    skill.applies.forEach(id => setStatus(state.enemy, id, 2))
    addLog('训练核心获得：挑衅、封印（2回合）。')
  }

  if (skill.power) {
    const crit = rollCrit(skill)
    const damage = calculateDamage(skill, crit)
    state.enemy.hp = Math.max(0, state.enemy.hp - damage)
    addLog(`${crit ? '暴击！' : ''}造成 ${damage} 点伤害。`)
  }

  if (state.enemy.hp <= 0) {
    addLog('训练核心失去战斗能力。')
    state.locked = false
    render()
    return
  }

  enemyHit(1)
  tickStatuses(state.enemy)
  state.turn += 1
  state.locked = false
  render()
}

function handleLab(action: string) {
  switch (action) {
    case 'heal':
      state.player.hp = state.player.maxHp
      state.enemy.hp = state.enemy.maxHp
      addLog('Lab：双方生命恢复至上限。')
      break
    case 'pp':
      state.pp = initialPp()
      addLog('Lab：全部技能 PP 已恢复。')
      break
    case 'crit':
      state.forceCrit = !state.forceCrit
      addLog(`Lab：强制暴击 ${state.forceCrit ? '已开启' : '已关闭'}。`)
      break
    case 'transform':
      transformPlayer()
      break
    case 'hit1':
      enemyHit(1)
      break
    case 'hit5':
      enemyHit(5)
      break
    case 'status':
      setStatus(state.enemy, 'taunt', 2)
      setStatus(state.enemy, 'seal', 2)
      addLog('Lab：训练核心获得挑衅与封印。')
      break
    case 'support':
      addLog(hasStatus(state.enemy, 'taunt') ? '测试：挑衅生效，敌方无法使用辅助技能。' : '测试：敌方可以使用辅助技能。')
      break
    case 'switch':
      addLog(hasStatus(state.enemy, 'seal') ? '测试：封印生效，敌方无法切换精灵。' : '测试：敌方可以切换精灵。')
      break
  }
  render()
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.skill
      const skill = allSkills.find(item => item.id === id)
      if (skill) playerUseSkill(skill)
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-lab]').forEach(button => {
    button.addEventListener('click', () => handleLab(button.dataset.lab ?? ''))
  })

  document.querySelector<HTMLButtonElement>('#resetBtn')?.addEventListener('click', () => {
    state = makeState()
    render()
  })

  document.querySelector<HTMLButtonElement>('#clearLog')?.addEventListener('click', () => {
    state.log = []
    render()
  })
}

render()
