import { ClassDef } from './types'

// Helper for default barrel
const standardBarrel = {
    xOffset: 25, yOffset: 0, angleOffset: 0,
    width: 14, length: 25,
    reloadRatio: 1, damageRatio: 1, spread: 0.05,
    speedRatio: 1, recoil: 1
}

export const CLASS_TREE: Record<string, ClassDef> = {
    // ================= TIER 1 (Lvl 1) =================
    'basic': {
        id: 'basic', name: 'Basic', desc: 'A simple starting tank.', stats: [], color: '#00ffff',
        healthMult: 1, speedMult: 1, damageMult: 1, reloadMult: 1, bulletSpeedMult: 1,
        upgradesTo: ['twin', 'sniper', 'machine_gun', 'flank_guard'],
        barrels: [standardBarrel]
    },

    // ================= TIER 2 (Lvl 15) =================
    'twin': {
        id: 'twin', name: 'Twin', desc: 'Fires two bullets parallel to each other.', stats: ['+ Fire Density'], color: '#00aaff',
        healthMult: 1, speedMult: 1, damageMult: 0.8, reloadMult: 1.2, bulletSpeedMult: 1,
        upgradesTo: ['triple_shot', 'quad_tank', 'twin_flank'],
        barrels: [
            { ...standardBarrel, yOffset: -8, length: 25 },
            { ...standardBarrel, yOffset: 8, length: 25 }
        ]
    },
    'sniper': {
        id: 'sniper', name: 'Sniper', desc: 'High damage, fast bullets, slow reload.', stats: ['+ Range', '+ Damage', '- Reload'], color: '#ffff44',
        healthMult: 0.9, speedMult: 1.1, damageMult: 1.8, reloadMult: 0.6, bulletSpeedMult: 1.5,
        upgradesTo: ['assassin', 'overseer', 'hunter'],
        barrels: [{ ...standardBarrel, length: 40, width: 10, spread: 0 }]
    },
    'machine_gun': {
        id: 'machine_gun', name: 'Machine Gun', desc: 'High fire rate but low accuracy.', stats: ['+ Fire Rate', '- Accuracy'], color: '#ff8844',
        healthMult: 1, speedMult: 1.05, damageMult: 0.6, reloadMult: 2, bulletSpeedMult: 1,
        upgradesTo: ['destroyer', 'gunner', 'sprayer'],
        barrels: [{ ...standardBarrel, length: 20, width: 18, spread: 0.3 }]
    },
    'flank_guard': {
        id: 'flank_guard', name: 'Flank Guard', desc: 'Fires forward and backward.', stats: ['+ Rear Defense'], color: '#ff44aa',
        healthMult: 1.1, speedMult: 1, damageMult: 0.9, reloadMult: 1, bulletSpeedMult: 1,
        upgradesTo: ['quad_tank', 'twin_flank', 'triangle'],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: Math.PI, length: 20 }
        ]
    },

    // ================= TIER 3 (Lvl 30) =================
    'triple_shot': {
        id: 'triple_shot', name: 'Triple Shot', desc: 'Fires three bullets in a spread.', stats: ['+ Coverage'], color: '#00aaff',
        healthMult: 1.1, speedMult: 0.95, damageMult: 0.7, reloadMult: 1.2, bulletSpeedMult: 1,
        upgradesTo: ['triplet', 'penta_shot', 'spread_shot'],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: -0.4, length: 20 },
            { ...standardBarrel, angleOffset: 0.4, length: 20 }
        ]
    },
    'quad_tank': {
        id: 'quad_tank', name: 'Quad Tank', desc: 'Fires in 4 directions.', stats: ['+ 360 Coverage'], color: '#00ccff',
        healthMult: 1.15, speedMult: 0.9, damageMult: 0.8, reloadMult: 1, bulletSpeedMult: 1,
        upgradesTo: ['octo_tank'],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: Math.PI / 2 },
            { ...standardBarrel, angleOffset: Math.PI },
            { ...standardBarrel, angleOffset: -Math.PI / 2 }
        ]
    },
    'twin_flank': {
        id: 'twin_flank', name: 'Twin Flank', desc: 'Twin barrels front and back.', stats: ['+ Directional Power'], color: '#ff66bb',
        healthMult: 1.1, speedMult: 1, damageMult: 0.8, reloadMult: 1.2, bulletSpeedMult: 1,
        upgradesTo: ['battleship', 'triple_twin'],
        barrels: [
            { ...standardBarrel, yOffset: -8 }, { ...standardBarrel, yOffset: 8 },
            { ...standardBarrel, angleOffset: Math.PI, yOffset: -8 }, { ...standardBarrel, angleOffset: Math.PI, yOffset: 8 }
        ]
    },
    'assassin': {
        id: 'assassin', name: 'Assassin', desc: 'Extreme damage and range.', stats: ['++ Range', '++ Damage'], color: '#ffdd00',
        healthMult: 0.8, speedMult: 1.2, damageMult: 2.5, reloadMult: 0.4, bulletSpeedMult: 2,
        upgradesTo: ['ranger', 'stalker'],
        barrels: [{ ...standardBarrel, length: 50, width: 8, spread: 0 }]
    },
    'destroyer': {
        id: 'destroyer', name: 'Destroyer', desc: 'Fires a massive, slow, devastating bullet.', stats: ['+++ Damage', '-- Reload'], color: '#ff5533',
        healthMult: 1.3, speedMult: 0.8, damageMult: 5, reloadMult: 0.2, bulletSpeedMult: 0.6,
        upgradesTo: ['hybrid', 'annihilator'],
        barrels: [{ ...standardBarrel, length: 30, width: 35, spread: 0 }]
    },
    'gunner': {
        id: 'gunner', name: 'Gunner', desc: 'Four small barrels with insane fire rate.', stats: ['+++ Fire Rate'], color: '#ff9944',
        healthMult: 0.9, speedMult: 1.1, damageMult: 0.3, reloadMult: 4, bulletSpeedMult: 1.2,
        upgradesTo: ['auto_gunner', 'streamliner'],
        barrels: [
            { ...standardBarrel, yOffset: -12, length: 25, width: 8 }, { ...standardBarrel, yOffset: -4, length: 20, width: 8 },
            { ...standardBarrel, yOffset: 4, length: 20, width: 8 }, { ...standardBarrel, yOffset: 12, length: 25, width: 8 }
        ]
    },
    'triangle': {
        id: 'triangle', name: 'Triangle', desc: 'Fastest chassis. Rear barrels give huge recoil boost.', stats: ['+++ Speed', '+ Flank Defense'], color: '#cc44ff',
        healthMult: 1, speedMult: 1.5, damageMult: 0.9, reloadMult: 1, bulletSpeedMult: 1,
        upgradesTo: ['booster', 'fighter'],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: Math.PI * 0.8, length: 20 },
            { ...standardBarrel, angleOffset: -Math.PI * 0.8, length: 20 }
        ]
    },

    // ================= TIER 4 (Lvl 45) =================
    'triplet': {
        id: 'triplet', name: 'Triplet', desc: 'Three forward barrels for solid DPS.', stats: ['++ Forward DPS'], color: '#00aaff',
        healthMult: 1.2, speedMult: 0.9, damageMult: 0.7, reloadMult: 1.4, bulletSpeedMult: 1,
        upgradesTo: [],
        barrels: [
            { ...standardBarrel, length: 25 },
            { ...standardBarrel, yOffset: -10, length: 20 },
            { ...standardBarrel, yOffset: 10, length: 20 }
        ]
    },
    'penta_shot': {
        id: 'penta_shot', name: 'Penta Shot', desc: 'Five barrels in a wide spread.', stats: ['++ Crowd Control'], color: '#00aaff',
        healthMult: 1.1, speedMult: 0.95, damageMult: 0.6, reloadMult: 1.3, bulletSpeedMult: 1.1,
        upgradesTo: [],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: -0.3, length: 22 }, { ...standardBarrel, angleOffset: 0.3, length: 22 },
            { ...standardBarrel, angleOffset: -0.6, length: 18 }, { ...standardBarrel, angleOffset: 0.6, length: 18 }
        ]
    },
    'octo_tank': {
        id: 'octo_tank', name: 'Octo Tank', desc: 'Absolute 360-degree dominance.', stats: ['+++ 360 Coverage'], color: '#00ccff',
        healthMult: 1.2, speedMult: 0.85, damageMult: 0.7, reloadMult: 1.2, bulletSpeedMult: 1,
        upgradesTo: [],
        barrels: Array.from({ length: 8 }).map((_, i) => ({
            ...standardBarrel, angleOffset: (i / 8) * Math.PI * 2, length: i % 2 === 0 ? 25 : 20
        }))
    },
    'ranger': {
        id: 'ranger', name: 'Ranger', desc: 'The ultimate sniper. Max range.', stats: ['+++ Range'], color: '#ffdd00',
        healthMult: 0.7, speedMult: 1.3, damageMult: 3.5, reloadMult: 0.3, bulletSpeedMult: 2.5,
        upgradesTo: [],
        barrels: [{ ...standardBarrel, length: 60, width: 8, spread: 0 }]
    },
    'annihilator': {
        id: 'annihilator', name: 'Annihilator', desc: 'Fires bullets sizes of small moons.', stats: ['++++ Damage', '+++ Blast Radius'], color: '#ff3311',
        healthMult: 1.5, speedMult: 0.7, damageMult: 8, reloadMult: 0.15, bulletSpeedMult: 0.5,
        upgradesTo: [],
        barrels: [{ ...standardBarrel, length: 30, width: 50, spread: 0 }]
    },
    'booster': {
        id: 'booster', name: 'Booster', desc: 'Insane speed via 4 rear thruster barrels.', stats: ['++++ Speed'], color: '#cc44ff',
        healthMult: 1.1, speedMult: 1.8, damageMult: 0.8, reloadMult: 1.1, bulletSpeedMult: 1,
        upgradesTo: [],
        barrels: [
            standardBarrel,
            { ...standardBarrel, angleOffset: Math.PI * 0.8, length: 20 }, { ...standardBarrel, angleOffset: -Math.PI * 0.8, length: 20 },
            { ...standardBarrel, angleOffset: Math.PI * 0.9, length: 16 }, { ...standardBarrel, angleOffset: -Math.PI * 0.9, length: 16 }
        ]
    }
}

// Ensure all missing tier-3 upgrades map to basic or themselves so it doesn't crash if incomplete temporarily
const pendingClasses = ['overseer', 'hunter', 'sprayer', 'battleship', 'triple_twin', 'stalker', 'hybrid', 'auto_gunner', 'streamliner', 'fighter', 'spread_shot']
pendingClasses.forEach(id => {
    if (!CLASS_TREE[id]) {
        CLASS_TREE[id] = { ...CLASS_TREE['basic'], id, name: id.toUpperCase().replace('_', ' '), desc: 'Coming soon...', upgradesTo: [] }
    }
})
