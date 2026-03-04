import { MutationDef, MutatorDef, MutationEffects, ActiveMutation, MutationRarity } from './types'

// ==========================================
// DEFAULT MUTATION EFFECTS (all neutral)
// ==========================================
export function defaultEffects(): MutationEffects {
    return {
        damageMult: 1, fireRateMult: 1, bulletSpeedMult: 1, bulletSizeMult: 1,
        maxHealthMult: 1, regenMult: 1, speedMult: 1, xpMult: 1,
        pickupRangeMult: 1, bulletLifetimeMult: 1, bodyDamageMult: 1,
        flatDamage: 0, flatHealth: 0, flatSpeed: 0, flatRegen: 0, flatArmor: 0,
        thornsPercent: 0, lifestealPercent: 0, dodgeChance: 0,
        critChance: 0, critMult: 1.5,
        bulletCount: 0, pierceCount: 0, bounceCount: 0, chainCount: 0,
        explosiveRadius: 0, homingStrength: 0,
        poisonDamage: 0, poisonDuration: 0,
        freezeChance: 0, freezeDuration: 0,
        fireTrail: false, orbitalBullets: 0, orbitalDamage: 0, orbitalSpeed: 1,
        shadowClones: 0, shieldOrbs: 0,
        magneticField: false, magneticDamage: 0,
        bulletsSplit: 0, bulletsGrow: false, reverseShot: false,
        zapOnKill: 0, healOnKill: 0, xpOnKill: 0,
        explodeOnDeath: false, dvdBounce: false,
        rampage: false, berserk: false, timeWarpOnKill: false,
        vampiricBullets: false, meteorShower: false,
        auraOfDecay: false, auraRadius: 0, auraDamage: 0,
    }
}

// ==========================================
//  MUTATION DEFINITIONS (100+)
// ==========================================
export const ALL_MUTATIONS: MutationDef[] = [
    // ===== OFFENSIVE: DAMAGE =====
    { id: 'dmg_1', name: 'Sharp Rounds', desc: '+15% bullet damage', icon: '🗡️', rarity: 'common', category: 'offensive', maxStacks: 5, effects: { damageMult: 1.15 } },
    { id: 'dmg_2', name: 'Hardened Tips', desc: '+25% bullet damage', icon: '⚔️', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { damageMult: 1.25 } },
    { id: 'dmg_3', name: 'Armor-Piercing', desc: '+40% bullet damage', icon: '🔱', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { damageMult: 1.40 } },
    { id: 'dmg_4', name: 'Devastation Core', desc: '+60% bullet damage', icon: '💀', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { damageMult: 1.60 } },
    { id: 'flat_dmg_1', name: 'Raw Power', desc: '+5 flat damage', icon: '💪', rarity: 'common', category: 'offensive', maxStacks: 10, effects: { flatDamage: 5 } },
    { id: 'flat_dmg_2', name: 'Empowered Shots', desc: '+15 flat damage', icon: '🔥', rarity: 'uncommon', category: 'offensive', maxStacks: 5, effects: { flatDamage: 15 } },

    // ===== OFFENSIVE: FIRE RATE =====
    { id: 'fire_1', name: 'Quick Trigger', desc: '+15% fire rate', icon: '⏱️', rarity: 'common', category: 'offensive', maxStacks: 5, effects: { fireRateMult: 1.15 } },
    { id: 'fire_2', name: 'Rapid Loader', desc: '+30% fire rate', icon: '⚡', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { fireRateMult: 1.30 } },
    { id: 'fire_3', name: 'Machine Feed', desc: '+50% fire rate', icon: '🔫', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { fireRateMult: 1.50 } },
    { id: 'fire_4', name: 'Bullet Storm', desc: '+80% fire rate', icon: '🌪️', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { fireRateMult: 1.80 } },

    // ===== OFFENSIVE: BULLET SPEED =====
    { id: 'bspd_1', name: 'Aerodynamic', desc: '+20% bullet speed', icon: '💨', rarity: 'common', category: 'offensive', maxStacks: 5, effects: { bulletSpeedMult: 1.20 } },
    { id: 'bspd_2', name: 'Railgun Rounds', desc: '+50% bullet speed', icon: '🚀', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { bulletSpeedMult: 1.50 } },
    { id: 'bspd_3', name: 'Lightspeed Ammo', desc: '+100% bullet speed, -20% damage', icon: '✨', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { bulletSpeedMult: 2.0, damageMult: 0.80 } },

    // ===== OFFENSIVE: BULLET SIZE =====
    { id: 'bsz_1', name: 'Wide Load', desc: '+25% bullet size', icon: '⭕', rarity: 'common', category: 'offensive', maxStacks: 5, effects: { bulletSizeMult: 1.25 } },
    { id: 'bsz_2', name: 'Cannonballs', desc: '+60% bullet size', icon: '🔴', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { bulletSizeMult: 1.60 } },
    { id: 'bsz_3', name: 'Megaballs', desc: '2x bullet size, -30% bullet speed', icon: '🌑', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { bulletSizeMult: 2.0, bulletSpeedMult: 0.70 } },

    // ===== OFFENSIVE: MULTI-HIT =====
    { id: 'pierce_1', name: 'Penetrating Rounds', desc: '+1 pierce', icon: '🏹', rarity: 'uncommon', category: 'offensive', maxStacks: 5, effects: { pierceCount: 1 } },
    { id: 'pierce_2', name: 'Railgun Spike', desc: '+3 pierce, +20% damage', icon: '📌', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { pierceCount: 3, damageMult: 1.2 } },
    { id: 'chain_1', name: 'Chain Lightning', desc: 'Bullets chain to 2 nearby enemies', icon: '⚡', rarity: 'rare', category: 'offensive', maxStacks: 3, effects: { chainCount: 2 } },
    { id: 'chain_2', name: 'Tesla Coil', desc: 'Bullets chain to 4 enemies, +25% dmg', icon: '🌩️', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { chainCount: 4, damageMult: 1.25 } },
    { id: 'bounce_1', name: 'Ricochet', desc: 'Bullets bounce off walls 2 times', icon: '🔄', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { bounceCount: 2 } },
    { id: 'bounce_2', name: 'Bouncy Madness', desc: 'Bullets bounce 5 times, +lifetime', icon: '🏐', rarity: 'rare', category: 'offensive', maxStacks: 1, effects: { bounceCount: 5, bulletLifetimeMult: 1.5 } },

    // ===== OFFENSIVE: MULTI-SHOT =====
    { id: 'multi_1', name: 'Double Barrel', desc: '+1 bullet per shot', icon: '🔫', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { bulletCount: 1 } },
    { id: 'multi_2', name: 'Triple Threat', desc: '+2 bullets per shot', icon: '🔱', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { bulletCount: 2 } },
    { id: 'multi_3', name: 'Lead Wall', desc: '+4 bullets, -40% accuracy', icon: '🧱', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { bulletCount: 4 } },
    { id: 'reverse', name: 'Rear Gun', desc: 'Also fire backwards', icon: '↩️', rarity: 'uncommon', category: 'offensive', maxStacks: 1, effects: { reverseShot: true } },
    { id: 'split_1', name: 'Fragmentation', desc: 'Bullets split into 2 on hit', icon: '💥', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { bulletsSplit: 2 } },
    { id: 'split_2', name: 'Cluster Munitions', desc: 'Bullets split into 4 on hit', icon: '🎆', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { bulletsSplit: 4 } },

    // ===== OFFENSIVE: EXPLOSIVE =====
    { id: 'explode_1', name: 'Blast Caps', desc: 'Bullets explode (small radius)', icon: '💣', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { explosiveRadius: 40 } },
    { id: 'explode_2', name: 'Heavy Ordnance', desc: 'Large explosion radius', icon: '🧨', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { explosiveRadius: 80 } },
    { id: 'explode_3', name: 'Nuclear Option', desc: 'Massive explosion, -50% fire rate', icon: '☢️', rarity: 'legendary', category: 'offensive', maxStacks: 1, effects: { explosiveRadius: 150, fireRateMult: 0.5 } },

    // ===== OFFENSIVE: HOMING =====
    { id: 'homing_1', name: 'Seeking Rounds', desc: 'Bullets gently home', icon: '🎯', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { homingStrength: 0.02 } },
    { id: 'homing_2', name: 'Heat Seekers', desc: 'Bullets aggressively home', icon: '🔥', rarity: 'rare', category: 'offensive', maxStacks: 1, effects: { homingStrength: 0.06 } },
    { id: 'homing_3', name: 'Smart Bombs', desc: 'Max homing, -30% bullet speed', icon: '🧠', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { homingStrength: 0.12, bulletSpeedMult: 0.7 } },

    // ===== OFFENSIVE: STATUS EFFECTS =====
    { id: 'poison_1', name: 'Toxic Tips', desc: 'Bullets poison enemies (5 dmg/s, 3s)', icon: '🧪', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { poisonDamage: 5, poisonDuration: 3 } },
    { id: 'poison_2', name: 'Necrotic Venom', desc: 'Heavy poison (15 dmg/s, 5s)', icon: '☠️', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { poisonDamage: 15, poisonDuration: 5 } },
    { id: 'freeze_1', name: 'Cryo Rounds', desc: '15% chance to freeze 2s', icon: '❄️', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { freezeChance: 0.15, freezeDuration: 2 } },
    { id: 'freeze_2', name: 'Deep Freeze', desc: '30% chance to freeze 3s', icon: '🧊', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { freezeChance: 0.30, freezeDuration: 3 } },
    { id: 'freeze_3', name: 'Absolute Zero', desc: '50% freeze, 4s, deals 2x to frozen', icon: '💎', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { freezeChance: 0.50, freezeDuration: 4 } },

    // ===== OFFENSIVE: CRITS =====
    { id: 'crit_1', name: 'Keen Eye', desc: '+10% critical hit chance', icon: '👁️', rarity: 'common', category: 'offensive', maxStacks: 5, effects: { critChance: 0.10 } },
    { id: 'crit_2', name: 'Precision Strike', desc: '+20% crit chance, +0.5x crit damage', icon: '🎯', rarity: 'uncommon', category: 'offensive', maxStacks: 3, effects: { critChance: 0.20, critMult: 0.5 } },
    { id: 'crit_3', name: 'Assassinate', desc: '+15% crit, +1.5x crit damage', icon: '🗡️', rarity: 'rare', category: 'offensive', maxStacks: 2, effects: { critChance: 0.15, critMult: 1.5 } },
    { id: 'crit_4', name: 'Execute', desc: 'Crits deal 5x damage, +5% chance', icon: '⚰️', rarity: 'epic', category: 'offensive', maxStacks: 1, effects: { critChance: 0.05, critMult: 3.5 } },

    // ===== OFFENSIVE: BULLET BEHAVIOR =====
    { id: 'grow', name: 'Growing Rounds', desc: 'Bullets grow larger over time', icon: '📈', rarity: 'uncommon', category: 'offensive', maxStacks: 1, effects: { bulletsGrow: true } },
    { id: 'lifetime_1', name: 'Extended Magazine', desc: '+40% bullet lifetime', icon: '📏', rarity: 'common', category: 'offensive', maxStacks: 3, effects: { bulletLifetimeMult: 1.40 } },

    // ===== DEFENSIVE: HEALTH =====
    { id: 'hp_1', name: 'Hardplate', desc: '+15% max health', icon: '🛡️', rarity: 'common', category: 'defensive', maxStacks: 5, effects: { maxHealthMult: 1.15 } },
    { id: 'hp_2', name: 'Reinforced Hull', desc: '+30% max health', icon: '🏰', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { maxHealthMult: 1.30 } },
    { id: 'hp_3', name: 'Fortress Core', desc: '+50% max health', icon: '🏯', rarity: 'rare', category: 'defensive', maxStacks: 2, effects: { maxHealthMult: 1.50 } },
    { id: 'hp_4', name: 'Immortal Frame', desc: '+80% max health', icon: '🗿', rarity: 'epic', category: 'defensive', maxStacks: 1, effects: { maxHealthMult: 1.80 } },
    { id: 'flat_hp_1', name: 'Extra Plating', desc: '+20 flat health', icon: '❤️', rarity: 'common', category: 'defensive', maxStacks: 10, effects: { flatHealth: 20 } },
    { id: 'flat_hp_2', name: 'Titanium Shell', desc: '+50 flat health', icon: '💖', rarity: 'uncommon', category: 'defensive', maxStacks: 5, effects: { flatHealth: 50 } },

    // ===== DEFENSIVE: REGEN =====
    { id: 'regen_1', name: 'Bio Repair', desc: '+2 hp/s regen', icon: '💚', rarity: 'common', category: 'defensive', maxStacks: 5, effects: { flatRegen: 2 } },
    { id: 'regen_2', name: 'Nano Repair', desc: '+5 hp/s regen', icon: '🧬', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { flatRegen: 5 } },
    { id: 'regen_3', name: 'Regeneration Matrix', desc: '+50% regen from all sources', icon: '🔄', rarity: 'rare', category: 'defensive', maxStacks: 2, effects: { regenMult: 1.50 } },

    // ===== DEFENSIVE: DAMAGE REDUCTION =====
    { id: 'armor_1', name: 'Light Armor', desc: '+3 flat armor (reduces all damage)', icon: '🛡️', rarity: 'common', category: 'defensive', maxStacks: 5, effects: { flatArmor: 3 } },
    { id: 'armor_2', name: 'Heavy Armor', desc: '+8 flat armor', icon: '⛏️', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { flatArmor: 8 } },
    { id: 'dodge_1', name: 'Evasion Module', desc: '+8% dodge chance', icon: '💫', rarity: 'uncommon', category: 'defensive', maxStacks: 4, effects: { dodgeChance: 0.08 } },
    { id: 'dodge_2', name: 'Phase Shift', desc: '+15% dodge chance', icon: '👻', rarity: 'rare', category: 'defensive', maxStacks: 2, effects: { dodgeChance: 0.15 } },

    // ===== DEFENSIVE: COUNTER =====
    { id: 'thorns_1', name: 'Spike Hull', desc: 'Reflect 15% dmg taken', icon: '🌵', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { thornsPercent: 0.15 } },
    { id: 'thorns_2', name: 'Mirror Shield', desc: 'Reflect 30% dmg as damage', icon: '🪞', rarity: 'rare', category: 'defensive', maxStacks: 2, effects: { thornsPercent: 0.30 } },
    { id: 'lifesteal_1', name: 'Life Drain', desc: 'Heal 5% of damage dealt', icon: '🩸', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { lifestealPercent: 0.05 } },
    { id: 'lifesteal_2', name: 'Soul Siphon', desc: 'Heal 12% of damage dealt', icon: '💉', rarity: 'rare', category: 'defensive', maxStacks: 2, effects: { lifestealPercent: 0.12 } },
    { id: 'vampiric', name: 'Vampiric Bullets', desc: 'Each bullet heals you for 1% dmg', icon: '🦇', rarity: 'rare', category: 'defensive', maxStacks: 1, effects: { vampiricBullets: true, lifestealPercent: 0.01 } },

    // ===== DEFENSIVE: ON-KILL =====
    { id: 'heal_kill_1', name: 'Carnage Heal', desc: 'Heal 3 HP on kill', icon: '❤️‍🔥', rarity: 'common', category: 'defensive', maxStacks: 5, effects: { healOnKill: 3 } },
    { id: 'heal_kill_2', name: 'Soul Harvest', desc: 'Heal 10 HP on kill', icon: '🌿', rarity: 'uncommon', category: 'defensive', maxStacks: 3, effects: { healOnKill: 10 } },

    // ===== DEFENSIVE: BODY =====
    { id: 'body_1', name: 'Spiked Bumper', desc: '+30% body damage', icon: '🔩', rarity: 'common', category: 'defensive', maxStacks: 3, effects: { bodyDamageMult: 1.30 } },
    { id: 'body_2', name: 'Battering Ram', desc: '+80% body damage, +20% max HP', icon: '🐏', rarity: 'rare', category: 'defensive', maxStacks: 1, effects: { bodyDamageMult: 1.80, maxHealthMult: 1.20 } },

    // ===== UTILITY: SPEED =====
    { id: 'spd_1', name: 'Turbo Thrusters', desc: '+12% movement speed', icon: '🏃', rarity: 'common', category: 'utility', maxStacks: 5, effects: { speedMult: 1.12 } },
    { id: 'spd_2', name: 'Nitro Boost', desc: '+25% movement speed', icon: '🚗', rarity: 'uncommon', category: 'utility', maxStacks: 3, effects: { speedMult: 1.25 } },
    { id: 'spd_3', name: 'Warp Drive', desc: '+40% movement speed', icon: '🌀', rarity: 'rare', category: 'utility', maxStacks: 2, effects: { speedMult: 1.40 } },
    { id: 'flat_spd_1', name: 'Quick Boots', desc: '+1 flat speed', icon: '👟', rarity: 'common', category: 'utility', maxStacks: 5, effects: { flatSpeed: 1 } },

    // ===== UTILITY: XP & PICKUP =====
    { id: 'xp_1', name: 'Study Guide', desc: '+15% XP gain', icon: '📘', rarity: 'common', category: 'utility', maxStacks: 5, effects: { xpMult: 1.15 } },
    { id: 'xp_2', name: 'Knowledge Surge', desc: '+35% XP gain', icon: '📚', rarity: 'uncommon', category: 'utility', maxStacks: 3, effects: { xpMult: 1.35 } },
    { id: 'xp_3', name: 'Enlightenment', desc: '+60% XP gain', icon: '🧘', rarity: 'rare', category: 'utility', maxStacks: 2, effects: { xpMult: 1.60 } },
    { id: 'xp_kill', name: 'XP Bounty', desc: '+3 bonus XP per kill', icon: '💎', rarity: 'common', category: 'utility', maxStacks: 10, effects: { xpOnKill: 3 } },
    { id: 'magnet_1', name: 'Magnetic Aura', desc: '+40% pickup range', icon: '🧲', rarity: 'common', category: 'utility', maxStacks: 3, effects: { pickupRangeMult: 1.40 } },
    { id: 'magnet_2', name: 'Gravity Well', desc: '+100% pickup range', icon: '🕳️', rarity: 'uncommon', category: 'utility', maxStacks: 2, effects: { pickupRangeMult: 2.0 } },

    // ===== UTILITY: SHIELD ORBS =====
    { id: 'shield_orb_1', name: 'Shield Orb', desc: '+1 orbiting shield orb', icon: '🔵', rarity: 'rare', category: 'utility', maxStacks: 4, effects: { shieldOrbs: 1 } },

    // ===== WILD: ORBITAL =====
    { id: 'orbital_1', name: 'Orbital Drone', desc: '+1 bullet orbiting you', icon: '🛸', rarity: 'rare', category: 'wild', maxStacks: 5, effects: { orbitalBullets: 1, orbitalDamage: 10, orbitalSpeed: 1 } },
    { id: 'orbital_2', name: 'Death Ring', desc: '+3 fast orbital bullets', icon: '💫', rarity: 'epic', category: 'wild', maxStacks: 2, effects: { orbitalBullets: 3, orbitalDamage: 15, orbitalSpeed: 2 } },
    { id: 'orbital_3', name: 'Saturn\'s Wrath', desc: '+5 orbitals, massive damage', icon: '🪐', rarity: 'legendary', category: 'wild', maxStacks: 1, effects: { orbitalBullets: 5, orbitalDamage: 25, orbitalSpeed: 1.5 } },

    // ===== WILD: FIRE & TRAILS =====
    { id: 'fire_trail', name: 'Fire Trail', desc: 'Leave a trail of fire behind you', icon: '🔥', rarity: 'rare', category: 'wild', maxStacks: 1, effects: { fireTrail: true } },
    { id: 'aura_1', name: 'Toxic Aura', desc: 'Nearby enemies take 5 dps', icon: '☣️', rarity: 'rare', category: 'wild', maxStacks: 3, effects: { auraOfDecay: true, auraRadius: 100, auraDamage: 5 } },
    { id: 'aura_2', name: 'Death Field', desc: 'Large aura deals 15 dps', icon: '🌑', rarity: 'epic', category: 'wild', maxStacks: 1, effects: { auraOfDecay: true, auraRadius: 180, auraDamage: 15 } },

    // ===== WILD: ON-KILL EFFECTS =====
    { id: 'zap_kill_1', name: 'Overload', desc: 'On kill: arc 30 dmg to 2 nearby', icon: '⚡', rarity: 'rare', category: 'wild', maxStacks: 3, effects: { zapOnKill: 30 } },
    { id: 'zap_kill_2', name: 'Nova Burst', desc: 'On kill: massive arc damage', icon: '🌟', rarity: 'epic', category: 'wild', maxStacks: 1, effects: { zapOnKill: 80 } },
    { id: 'time_warp', name: 'Temporal Kill', desc: 'Kills briefly slow time', icon: '⏳', rarity: 'rare', category: 'wild', maxStacks: 1, effects: { timeWarpOnKill: true } },

    // ===== WILD: CLONES & SUMMONS =====
    { id: 'clone_1', name: 'Shadow Clone', desc: '+1 shadow clone that mimics you', icon: '👤', rarity: 'epic', category: 'wild', maxStacks: 2, effects: { shadowClones: 1 } },
    { id: 'clone_2', name: 'Mirror Army', desc: '+2 shadow clones', icon: '👥', rarity: 'legendary', category: 'wild', maxStacks: 1, effects: { shadowClones: 2 } },

    // ===== WILD: SPECIAL MECHANICS =====
    { id: 'magnetic', name: 'Magnetic Field', desc: 'Pull enemies toward you, deal damage', icon: '🧲', rarity: 'rare', category: 'wild', maxStacks: 1, effects: { magneticField: true, magneticDamage: 3 } },
    { id: 'meteor', name: 'Meteor Shower', desc: 'Periodic meteor strikes on enemies', icon: '☄️', rarity: 'epic', category: 'wild', maxStacks: 1, effects: { meteorShower: true } },
    { id: 'dvd', name: 'DVD Mode', desc: 'Bounce off walls at high speed', icon: '📀', rarity: 'rare', category: 'wild', maxStacks: 1, effects: { dvdBounce: true, speedMult: 1.3 } },
    { id: 'explode_death', name: 'Martyrdom', desc: 'Explode massively on death', icon: '💀', rarity: 'uncommon', category: 'wild', maxStacks: 1, effects: { explodeOnDeath: true } },

    // ===== CURSED: TRADE-OFFS =====
    { id: 'glass_cannon', name: 'Glass Cannon', desc: '+80% damage, -40% max HP', icon: '🔮', rarity: 'rare', category: 'cursed', maxStacks: 2, effects: { damageMult: 1.80, maxHealthMult: 0.60 } },
    { id: 'berserker', name: 'Berserker Rage', desc: 'Deal more damage the lower your HP', icon: '😡', rarity: 'rare', category: 'cursed', maxStacks: 1, effects: { berserk: true } },
    { id: 'rampage_mode', name: 'Rampage', desc: 'Kill streaks increase damage', icon: '💢', rarity: 'rare', category: 'cursed', maxStacks: 1, effects: { rampage: true } },
    { id: 'tiny_terror', name: 'Tiny Terror', desc: '-30% size, +50% speed, +30% dodge', icon: '🐜', rarity: 'rare', category: 'cursed', maxStacks: 1, effects: { speedMult: 1.50, dodgeChance: 0.30 } },
    { id: 'juggernaut', name: 'Juggernaut', desc: '+100% HP, +50% body dmg, -40% speed', icon: '🦣', rarity: 'rare', category: 'cursed', maxStacks: 1, effects: { maxHealthMult: 2.0, bodyDamageMult: 1.50, speedMult: 0.60 } },
    { id: 'bullet_hell', name: 'Bullet Hell', desc: '+5 bullets, -70% damage per bullet', icon: '🌸', rarity: 'epic', category: 'cursed', maxStacks: 1, effects: { bulletCount: 5, damageMult: 0.30 } },
    { id: 'sniper_curse', name: 'One Shot', desc: '+300% dmg, -80% fire rate, -50% size', icon: '🎯', rarity: 'epic', category: 'cursed', maxStacks: 1, effects: { damageMult: 4.0, fireRateMult: 0.20, bulletSizeMult: 0.50 } },
    { id: 'chaos_engine', name: 'Chaos Engine', desc: 'All stats randomly vary ±30% each shot', icon: '🎰', rarity: 'legendary', category: 'cursed', maxStacks: 1, effects: {} },
    { id: 'fragile_speed', name: 'Fragile Speedster', desc: '+60% speed, -50% HP, +20% dodge', icon: '⚡', rarity: 'rare', category: 'cursed', maxStacks: 1, effects: { speedMult: 1.60, maxHealthMult: 0.50, dodgeChance: 0.20 } },
    { id: 'tank_mode', name: 'Living Fortress', desc: '+150% HP, +100% body, -60% fire rate, -30% spd', icon: '🏰', rarity: 'epic', category: 'cursed', maxStacks: 1, effects: { maxHealthMult: 2.50, bodyDamageMult: 2.0, fireRateMult: 0.40, speedMult: 0.70 } },
    { id: 'vampiric_curse', name: 'Vampiric Hunger', desc: 'Lifesteal 20%, but -3 HP/s drain', icon: '🧛', rarity: 'epic', category: 'cursed', maxStacks: 1, effects: { lifestealPercent: 0.20, flatRegen: -3 } },
    { id: 'overcharge', name: 'Overcharge', desc: '+50% all dmg, but take 20% more', icon: '🔋', rarity: 'rare', category: 'cursed', maxStacks: 2, effects: { damageMult: 1.50, flatArmor: -5 } },
    { id: 'risky_reload', name: 'Risky Reload', desc: '+60% fire rate, -25% HP', icon: '♻️', rarity: 'uncommon', category: 'cursed', maxStacks: 2, effects: { fireRateMult: 1.60, maxHealthMult: 0.75 } },
    { id: 'all_in', name: 'All-In', desc: '+40% dmg, +40% fire, -60% HP', icon: '🎲', rarity: 'epic', category: 'cursed', maxStacks: 1, effects: { damageMult: 1.40, fireRateMult: 1.40, maxHealthMult: 0.40 } },
]

// ==========================================
// GENERATE ADDITIONAL TIER VARIANTS TO REACH 100+
// ==========================================
const tierNames = ['Mk.II', 'Mk.III', 'Mk.IV']
const basesToTier = ['dmg_1', 'fire_1', 'hp_1', 'spd_1', 'regen_1', 'armor_1', 'xp_1', 'flat_dmg_1', 'flat_hp_1', 'flat_spd_1']

basesToTier.forEach(baseId => {
    const base = ALL_MUTATIONS.find(m => m.id === baseId)
    if (!base) return
    tierNames.forEach((tier, ti) => {
        const mult = 1.5 + ti * 0.5 // 1.5x, 2x, 2.5x the base effect
        const newEffects: Partial<MutationEffects> = {}
        for (const [k, v] of Object.entries(base.effects)) {
            if (typeof v === 'number') {
                // For multiplicative effects (close to 1.0), scale the bonus
                if (v > 0.5 && v < 2) {
                    const bonus = v - 1
                        ; (newEffects as any)[k] = 1 + bonus * mult
                } else {
                    ; (newEffects as any)[k] = v * mult
                }
            }
        }
        const rarities: MutationDef['rarity'][] = ['uncommon', 'rare', 'epic']
        ALL_MUTATIONS.push({
            id: `${baseId}_t${ti + 2}`,
            name: `${base.name} ${tier}`,
            desc: `${base.desc} (${tier})`,
            icon: base.icon,
            rarity: rarities[ti] || 'rare',
            category: base.category,
            maxStacks: Math.max(1, base.maxStacks - ti - 1),
            effects: newEffects,
        })
    })
})

// ==========================================
// PRE-RUN MUTATORS
// ==========================================
export const ALL_MUTATORS: MutatorDef[] = [
    { id: 'mut_tanky', name: 'Armored Horde', desc: 'Enemies have 2x HP', icon: '🛡️', scoreMultiplier: 1.5, effects: {}, enemyHpMult: 2 },
    { id: 'mut_fast', name: 'Speed Demons', desc: 'Enemies are 50% faster', icon: '💨', scoreMultiplier: 1.3, effects: {}, enemySpeedMult: 1.5 },
    { id: 'mut_dmg', name: 'Lethal Touch', desc: 'Enemies deal 2x damage', icon: '☠️', scoreMultiplier: 1.4, effects: {}, enemyDamageMult: 2 },
    { id: 'mut_swarm', name: 'Endless Swarm', desc: '2x enemy spawn rate', icon: '🐝', scoreMultiplier: 1.6, effects: {}, enemyCountMult: 2 },
    { id: 'mut_tiny_arena', name: 'Tiny Arena', desc: 'Half-sized map', icon: '📦', scoreMultiplier: 1.8, effects: {}, arenaScale: 0.5 },
    { id: 'mut_glass', name: 'Glass World', desc: 'You have -50% max HP', icon: '🔮', scoreMultiplier: 1.5, effects: { maxHealthMult: 0.5 } },
    { id: 'mut_no_regen', name: 'No Mercy', desc: 'Health regen disabled', icon: '🚫', scoreMultiplier: 1.3, effects: { regenMult: 0 } },
    { id: 'mut_double_boss', name: 'Boss Rush', desc: 'Bosses spawn 3x as often', icon: '👑', scoreMultiplier: 1.7, effects: {} },
    { id: 'mut_slow_you', name: 'Molasses', desc: 'You are 30% slower', icon: '🐌', scoreMultiplier: 1.2, effects: { speedMult: 0.7 } },
    { id: 'mut_chaos', name: 'Chaos Mode', desc: 'All enemies randomized', icon: '🎰', scoreMultiplier: 1.4, effects: {} },
    { id: 'mut_big_bullets', name: 'Cannonball Fight', desc: 'All bullets 3x bigger (yours & enemies)', icon: '🔴', scoreMultiplier: 1.0, effects: { bulletSizeMult: 3 } },
    { id: 'mut_bouncy', name: 'Bounce House', desc: 'All bullets bounce off walls', icon: '🏐', scoreMultiplier: 1.1, effects: { bounceCount: 3 } },
    { id: 'mut_fog', name: 'Fog of War', desc: 'Limited visibility radius', icon: '🌫️', scoreMultiplier: 1.5, effects: {} },
    { id: 'mut_elite', name: 'Elite Enemies Only', desc: 'Only strong enemies spawn', icon: '💎', scoreMultiplier: 2.0, effects: {}, enemyHpMult: 3, enemyDamageMult: 1.5 },
    { id: 'mut_easy', name: 'Chill Mode', desc: 'Half enemy spawns, -50% score', icon: '😎', scoreMultiplier: 0.5, effects: {}, enemyCountMult: 0.5 },
]

// ==========================================
// HELPER: PICK RANDOM MUTATIONS FOR DRAFT
// ==========================================
export function pickMutationDraft(
    owned: ActiveMutation[],
    count: number = 3,
    level: number = 1
): MutationDef[] {
    const ownedIds = new Map<string, number>()
    owned.forEach(m => ownedIds.set(m.def.id, m.stacks))

    // Filter out maxed-out mutations
    const available = ALL_MUTATIONS.filter(m => {
        const currentStacks = ownedIds.get(m.id) || 0
        return currentStacks < m.maxStacks
    })

    // Weight by rarity - rarer shows up less but more at higher levels
    const weights: Record<string, number> = {
        common: 40,
        uncommon: 30,
        rare: 15 + Math.min(level, 20),
        epic: 8 + Math.min(level * 0.5, 15),
        legendary: 2 + Math.min(level * 0.3, 10),
    }

    const weighted: MutationDef[] = []
    available.forEach(m => {
        const w = weights[m.rarity] || 10
        for (let i = 0; i < w; i++) weighted.push(m)
    })

    // Pick unique mutations
    const picked: MutationDef[] = []
    const usedIds = new Set<string>()
    let attempts = 0
    while (picked.length < count && attempts < 200) {
        const m = weighted[Math.floor(Math.random() * weighted.length)]
        if (m && !usedIds.has(m.id)) {
            picked.push(m)
            usedIds.add(m.id)
        }
        attempts++
    }

    return picked
}

// Helper to get rarity color
export function rarityColor(r: MutationRarity): string {
    switch (r) {
        case 'common': return '#aaaaaa'
        case 'uncommon': return '#44ff44'
        case 'rare': return '#4488ff'
        case 'epic': return '#cc44ff'
        case 'legendary': return '#ffaa00'
    }
}

export function rarityBgColor(r: MutationRarity): string {
    switch (r) {
        case 'common': return '#222233'
        case 'uncommon': return '#1a3322'
        case 'rare': return '#1a2244'
        case 'epic': return '#2a1a33'
        case 'legendary': return '#332a11'
    }
}
