import './style.css'

type ElementType = '冰' | '钢' | '无'
type SkillKind = '物理' | '魔法' | '辅助' | '绝招'
type StatusId = 'taunt' | 'seal'
type FormId = 'default' | 'war'

type StatusState = {
  id: StatusId
  name: string
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

const VERSION = 'v0.1.0 · alpha'

const baseSkills: Skill[] = [
  {
    id: 'coldSlash',
    name: '厉寒斩击',
    element: '冰',
    kind: '物理',
    power: 75,
    maxPp: 10,
    description: '威力75 · 物理攻击 · 暴击率与暴击伤害 +50%',
    critBonus: 0.5,
    critDamageBonus: 0.5,
  },
  {
    id: 'windBlade',
    name: '凌风气刃',
    element: '钢',
    kind: '魔法',
    power: 75,
    maxPp: 10,
    description: '威力75 · 魔法攻击 · 暴击率与暴击伤害 +50%',
    critBonus: 0.5,
    critDamageBonus: 0.5,
  },
  {
    id: 'starLock',
    name: '星锁',
    element: '钢',
    kind: '辅助',
    maxPp: 5,
    description: '对目标附加挑衅与封印2回合',
    applies: ['taunt', 'seal'],
  },
  {
    id: 'purify',
    name: '净化再生',
    element: '冰',
    kind: '辅助',
    maxPp: 3,
    description: '驱散自身1个不利状态，并回复30%最大生命',
    healPercent: 0.3,
    cleanseCount: 1,
  },
]

const ultimateDefault: Skill = {
  id: 'starDomain',
  name: '星辰战域',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  description: '先手+1 · 特殊攻击 · 暴击率+50% · 先变身战王形态再攻击',
  critBonus: 0.5,
  transformBeforeHit: true,
}

const ultimateWar: Skill = {
  id: 'endlessWar',
  name: '无尽狂战',
  element: '冰',
  kind: '绝招',
  power: 95,
  maxPp: 3,
  priority: 1,
  description: '战王形态绝招 · 先手+1 · 特殊攻击 · 暴击率+50%',
  critBonus: 0.5,
}

const statusMeta: Record<StatusId, { name: string; description: string }> = {
  taunt: { name: '挑衅', description: '无法使用辅助技能' },
  seal: { name: '封印', description: '无法切换精灵' },
}

const initialPp = () => Object.fromEntries(
  [...baseSkills, ultimateDefault, ultimateWar].map(skill => [skill.id, skill.maxPp]),
)

const makeState = (): BattleState => ({
  turn: 1,
  player: {
    name: '星尘战王',
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
  log: ['训练场连接完成。星尘战王进入战斗。'],
  locked: false,
  forceCrit: false,
})

let state = makeState()

const app = document.querySelector<HTMLDivElement>('#app')!

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function currentUltimate() {
  return state.player.form === 'war' ? ultimateWar : ultimateDefault
}

function statusChip(status: StatusState) {
  const meta = statusMeta[status.id]
  return `<span class="status-chip" title="${meta.description}">${meta.name}<b>${status.turns}</b></span>`
}

function hpPercent(fighter: Fighter) {
  return clamp((fighter.hp / fighter.maxHp) * 100, 0, 100)
}

function formLabel() {
  return state.player.form === 'war' ? '战王形态' : '默认形态'
}

function passiveLabel() {
  return state.player.form === 'war'
    ? '圣迹：暴击率 +50%'
    : '星瀚：每次受到伤害后恢复 6% 最大生命'
}

function skillButton(skill: Skill, index: number) {
  const pp = state.pp[skill.id] ?? 0
  const exhausted = pp <= 0
  const elementClass = skill.element === '冰' ? 'ice' : skill.element === '钢' ? 'steel' : 'neutral'
  return `
    <button class="skill-card ${elementClass} ${skill.kind === '绝招' ? 'ultimate-card' : ''}" data-skill="${skill.id}" ${exhausted || state.locked ? 'disabled' : ''}>
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
        <article class="fighter player ${state.player.form === 'war' ? 'war' : ''}">
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

        <div class="versus">
          <span>VS</span>
          <small>TRAINING</small>
        </div>

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
            <div>
              <span class="eyebrow">本回合操作</span>
              <h3>选择技能</h3>
            </div>
            <span class="hint">点技能后，训练核心会自动反击</span>
          </div>
          <div class="skills-grid">
            ${baseSkills.map((skill, index) => skillButton(skill, index + 1)).join('')}
          </div>
          <div class="ultimate-wrap">
            ${skillButton(currentUltimate(), 5)}
          </div>
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

      <footer>
        <span>${VERSION}</span>
        <span>Web prototype · offline-ready later</span>
      </footer>
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
  else target.statuses.push({ id, name: statusMeta[id].name, turns })
}

function tickStatuses(target: Fighter) {
  target.statuses.forEach(status => status.turns -= 1)
  target.statuses = target.statuses.filter(status => status.turns > 0)
}

function hasStatus(target: Fighter, id: StatusId) {
  return target.statuses.some(status => status.id === id && status.turns > 0)
}

function transformPlayer(force?: FormId) {
  const nextForm = force ?? (state.player.form === 'default' ? 'war' : 'default')
  if (nextForm === state.player.form) return
  state.player.form = nextForm

  if (nextForm === 'war') {
    state.player.attack = 421
    state.player.magic = 417
    state.player.defense = 218
    state.player.magicDefense = 210
    addLog('✦ 星尘战王完成变身：战王形态！特性切换为「圣迹」。')
  } else {
    state.player.attack = 382
    state.player.magic = 379
    state.player.defense = 245
    state.player.magicDefense = 234
    addLog('星尘战王恢复默认形态，特性切换为「星瀚」。')
  }
}

function rollCrit(skill: Skill) {
  const baseCrit = 0.08
  const passive = state.player.form === 'war' ? 0.5 : 0
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

function playerUseSkill(skill: Skill) {
  if (state.locked || state.player.hp <= 0 || state.enemy.hp <= 0) return
  const pp = state.pp[skill.id] ?? 0
  if (pp <= 0) {
    addLog(`${skill.name} 已没有 PP。`)
    render()
    return
  }

  state.locked = true
  state.pp[skill.id] = pp - 1
  addLog(`我方使用「${skill.name}」。`)

  if (skill.transformBeforeHit) transformPlayer('war')

  if (skill.healPercent) {
    const before = state.player.hp
    state.player.hp = clamp(state.player.hp + state.player.maxHp * skill.healPercent, 0, state.player.maxHp)
    addLog(`净化再生恢复 ${Math.round(state.player.hp - before)} 点生命。`)
  }

  if (skill.cleanseCount && state.player.statuses.length) {
    const removed = state.player.statuses.splice(0, skill.cleanseCount)
    addLog(`驱散：${removed.map(status => status.name).join('、')}。`)
  }

  if (skill.applies) {
    skill.applies.forEach(id => setStatus(state.enemy, id, 2))
    addLog('训练核心获得「挑衅」「封印」，持续 2 回合。')
  }

  if (skill.power) {
    const crit = rollCrit(skill)
    const damage = calculateDamage(skill, crit)
    state.enemy.hp = clamp(state.enemy.hp - damage, 0, state.enemy.maxHp)
    addLog(`${crit ? '💥 暴击！' : ''}${skill.name} 造成 ${damage} 点伤害。`)
  }

  if (state.enemy.hp <= 0) {
    addLog('训练核心失去战斗能力。训练结束。')
    state.locked = false
    render()
    return
  }

  window.setTimeout(() => {
    enemyAttack(1, false)
    endTurn()
    state.locked = false
    render()
  }, 320)
}

function receiveDamage(amount: number) {
  state.player.hp = clamp(state.player.hp - amount, 0, state.player.maxHp)
  addLog(`训练核心造成 ${amount} 点伤害。`)

  if (state.player.hp > 0 && state.player.form === 'default') {
    const heal = Math.round(state.player.maxHp * 0.06)
    const before = state.player.hp
    state.player.hp = clamp(state.player.hp + heal, 0, state.player.maxHp)
    addLog(`「星瀚」触发：本段伤害后恢复 ${Math.round(state.player.hp - before)} 点生命。`)
  }
}

function enemyAttack(hits = 1, renderAfter = true) {
  if (state.player.hp <= 0) return
  const perHit = hits === 1 ? 72 : 26
  addLog(`训练核心发动 ${hits > 1 ? `${hits} 段连续攻击` : '攻击'}。`)
  for (let index = 0; index < hits; index += 1) {
    if (state.player.hp <= 0) break
    receiveDamage(perHit)
  }
  if (state.player.hp <= 0) addLog('星尘战王失去战斗能力。')
  if (renderAfter) render()
}

function endTurn() {
  tickStatuses(state.player)
  tickStatuses(state.enemy)
  state.turn += 1
}

function testEnemySupport() {
  if (hasStatus(state.enemy, 'taunt')) {
    addLog('🚫 训练核心尝试使用辅助技能，但被「挑衅」阻止。')
  } else {
    addLog('训练核心成功使用辅助技能：防御提升。')
  }
  render()
}

function testEnemySwitch() {
  if (hasStatus(state.enemy, 'seal')) {
    addLog('🚫 训练核心尝试换宠，但被「封印」阻止。')
  } else {
    addLog('训练核心成功执行换宠（实验事件）。')
  }
  render()
}

function labAction(action: string) {
  switch (action) {
    case 'heal':
      state.player.hp = state.player.maxHp
      state.enemy.hp = state.enemy.maxHp
      addLog('Lab：双方生命已恢复。')
      break
    case 'pp':
      state.pp = initialPp()
      addLog('Lab：全部技能 PP 已恢复。')
      break
    case 'crit':
      state.forceCrit = !state.forceCrit
      addLog(`Lab：强制暴击${state.forceCrit ? '已开启（仅下一次伤害技能）' : '已关闭'}。`)
      break
    case 'transform':
      transformPlayer()
      break
    case 'hit1':
      enemyAttack(1, false)
      break
    case 'hit5':
      enemyAttack(5, false)
      break
    case 'status':
      setStatus(state.enemy, 'taunt', 2)
      setStatus(state.enemy, 'seal', 2)
      addLog('Lab：训练核心获得挑衅与封印。')
      break
    case 'support':
      testEnemySupport()
      return
    case 'switch':
      testEnemySwitch()
      return
  }
  render()
}

function bindEvents() {
  document.querySelectorAll<HTMLButtonElement>('[data-skill]').forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.skill
      const skill = [...baseSkills, ultimateDefault, ultimateWar].find(item => item.id === id)
      if (skill) playerUseSkill(skill)
    })
  })

  document.querySelectorAll<HTMLButtonElement>('[data-lab]').forEach(button => {
    button.addEventListener('click', () => labAction(button.dataset.lab ?? ''))
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
