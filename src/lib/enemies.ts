import { EnemyDef, EnemyBehaviorConfig } from './types'

export const ENEMY_TYPES: Record<string, EnemyDef> = {}

const addEnemy = (def: EnemyDef) => { ENEMY_TYPES[def.type] = def }

// --- TIER 1: Basic Swarmers ---
addEnemy({ type: 'swarm', health: 10, size: 15, damage: 5, points: 10, money: 2, fireRate: 0, speed: 4.5, color: '#ffaaaa', shape: 'circle', boss: false, behaviors: [{ type: 'chase' }] })
addEnemy({ type: 'chaser', health: 35, size: 25, damage: 10, points: 25, money: 5, fireRate: 0, speed: 3.5, color: '#ff4444', shape: 'square', boss: false, behaviors: [{ type: 'chase' }] })
addEnemy({ type: 'speedster', health: 20, size: 20, damage: 8, points: 30, money: 6, fireRate: 0, speed: 6, color: '#ff8800', shape: 'triangle', boss: false, behaviors: [{ type: 'chase' }] })

// --- TIER 2: Basic Ranged ---
addEnemy({ type: 'shooter', health: 40, size: 30, damage: 12, points: 40, money: 10, fireRate: 1500, speed: 2.5, color: '#44ff44', shape: 'square', boss: false, behaviors: [{ type: 'kite', range: 300 }] })
addEnemy({ type: 'sniper', health: 30, size: 28, damage: 30, points: 50, money: 15, fireRate: 3000, speed: 2, color: '#ffff44', shape: 'triangle', boss: false, behaviors: [{ type: 'snipe', range: 500 }] })
addEnemy({ type: 'burst_shooter', health: 50, size: 32, damage: 10, points: 60, money: 18, fireRate: 800, speed: 2.2, color: '#88ff44', shape: 'octagon', boss: false, behaviors: [{ type: 'kite', range: 250 }] })

// --- TIER 3: Heavy / Melee ---
addEnemy({ type: 'tank', health: 150, size: 45, damage: 20, points: 80, money: 20, fireRate: 0, speed: 1.5, color: '#ff8844', shape: 'octagon', boss: false, behaviors: [{ type: 'chase' }] })
addEnemy({ type: 'charger', health: 80, size: 35, damage: 30, points: 90, money: 22, fireRate: 0, speed: 2, color: '#ffaa00', shape: 'triangle', boss: false, behaviors: [{ type: 'charge' }] })
addEnemy({ type: 'bomber', health: 60, size: 35, damage: 80, points: 100, money: 25, fireRate: 0, speed: 3.2, color: '#ff2222', shape: 'circle', boss: false, behaviors: [{ type: 'bomb' }] })

// --- TIER 4: Utility / Support ---
addEnemy({ type: 'healer', health: 60, size: 25, damage: 0, points: 70, money: 15, fireRate: 2000, speed: 3, color: '#44ffcc', shape: 'circle', boss: false, behaviors: [{ type: 'heal', range: 200 }] })
addEnemy({ type: 'spawner', health: 200, size: 55, damage: 10, points: 150, money: 35, fireRate: 4000, speed: 1, color: '#8888ff', shape: 'octagon', boss: false, spawnTypes: ['swarm'], behaviors: [{ type: 'spawn' }] })
addEnemy({ type: 'teleporter', health: 50, size: 28, damage: 15, points: 120, money: 25, fireRate: 1000, speed: 1, color: '#cc44ff', shape: 'star', boss: false, behaviors: [{ type: 'teleport', range: 300 }, { type: 'kite', range: 200 }] })

// --- TIER 5: Advanced Ranged ---
addEnemy({ type: 'artillery', health: 80, size: 40, damage: 45, points: 160, money: 40, fireRate: 4000, speed: 1.2, color: '#4444ff', shape: 'square', boss: false, behaviors: [{ type: 'kite', range: 600 }] })
addEnemy({ type: 'orbiter', health: 70, size: 30, damage: 15, points: 130, money: 30, fireRate: 1200, speed: 3.5, color: '#00ffff', shape: 'circle', boss: false, behaviors: [{ type: 'orbit', orbitRadius: 250 }] })
addEnemy({ type: 'stealth_sniper', health: 40, size: 25, damage: 50, points: 180, money: 45, fireRate: 2500, speed: 2.5, color: '#aaaaaa', shape: 'triangle', boss: false, behaviors: [{ type: 'snipe', range: 450 }] })

// --- PROCEDURALLY GENERATE MORE VARIANTS (Totaling ~50) ---
const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff']
const shapes: EnemyDef['shape'][] = ['circle', 'square', 'triangle', 'octagon', 'star']
const prefixes = ['Elite', 'Armored', 'Frenzied', 'Ghost', 'Giant', 'Tiny']

for (let i = 0; i < 35; i++) {
    const prefix = prefixes[i % prefixes.length]
    const baseType = Object.values(ENEMY_TYPES)[i % 15]

    let hpMult = 1, spdMult = 1, dmgMult = 1, sizeMult = 1
    if (prefix === 'Elite') { hpMult = 3; dmgMult = 2; sizeMult = 1.2 }
    if (prefix === 'Armored') { hpMult = 5; spdMult = 0.5; sizeMult = 1.3 }
    if (prefix === 'Frenzied') { hpMult = 0.7; spdMult = 2; dmgMult = 0.8; sizeMult = 0.8 }
    if (prefix === 'Ghost') { hpMult = 0.5; spdMult = 1.5; dmgMult = 1.5 }
    if (prefix === 'Giant') { hpMult = 8; spdMult = 0.4; dmgMult = 3; sizeMult = 2.5 }
    if (prefix === 'Tiny') { hpMult = 0.3; spdMult = 2.5; dmgMult = 0.5; sizeMult = 0.5 }

    const newType = `${prefix.toLowerCase()}_${baseType.type}_${i}`

    addEnemy({
        type: newType,
        health: baseType.health * hpMult,
        size: baseType.size * sizeMult,
        damage: baseType.damage * dmgMult,
        points: Math.floor(baseType.points * hpMult * spdMult),
        money: Math.floor(baseType.money * hpMult),
        fireRate: baseType.fireRate > 0 ? baseType.fireRate / spdMult : 0,
        speed: baseType.speed * spdMult,
        color: colors[i % colors.length],
        shape: shapes[i % shapes.length],
        boss: false,
        behaviors: baseType.behaviors,
        spawnTypes: baseType.spawnTypes
    })
}

// --- BOSSES ---
addEnemy({ type: 'boss_alpha', health: 2500, size: 100, damage: 30, points: 2000, money: 500, fireRate: 600, speed: 1.5, color: '#ff00ff', shape: 'octagon', boss: true, behaviors: [{ type: 'circle', orbitRadius: 300 }] })
addEnemy({ type: 'boss_omega', health: 5000, size: 120, damage: 50, points: 5000, money: 1000, fireRate: 2000, speed: 1, color: '#ffffff', shape: 'star', boss: true, spawnTypes: ['tank', 'shooter', 'healer'], behaviors: [{ type: 'spawn' }, { type: 'kite', range: 400 }] })
