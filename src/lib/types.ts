export type GameState = 'title' | 'lobby' | 'playing' | 'shop' | 'paused' | 'gameover' | 'settings' | 'howto' | 'class_select' | 'mutator_select' | 'mutation_draft' | 'story_dialogue' | 'story_victory'
export type Difficulty = 'easy' | 'normal' | 'hard'
export type WeaponType = 'standard' | 'spread' | 'laser' | 'rockets' | 'plasma'
export type AbilityType = 'emp' | 'shield' | 'slow' | 'none'
export type PlayerClass = 'assault' | 'tank' | 'sniper' | 'engineer'

export interface Vector2 { x: number; y: number }

export interface BarrelDef {
    xOffset: number
    yOffset: number
    angleOffset: number
    width: number
    length: number
    reloadRatio: number
    damageRatio: number
    spread: number
    speedRatio: number
    recoil: number
}

export interface ClassDef {
    id: string
    name: string
    desc: string
    stats: string[]
    color: string
    healthMult: number
    speedMult: number
    damageMult: number
    reloadMult: number
    bulletSpeedMult: number
    barrels: BarrelDef[]
    upgradesTo: string[]
}

export interface PlayerStats {
    healthRegen: number;
    maxHealth: number;
    bodyDamage: number;
    bulletSpeed: number;
    bulletPenetration: number;
    bulletDamage: number;
    reload: number;
    movementSpeed: number;
}

// ======= MUTATION SYSTEM =======

export type MutationRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type MutationCategory = 'offensive' | 'defensive' | 'utility' | 'wild' | 'cursed'

export interface MutationEffects {
    // Multiplicative stat modifiers (1.0 = no change)
    damageMult: number
    fireRateMult: number
    bulletSpeedMult: number
    bulletSizeMult: number
    maxHealthMult: number
    regenMult: number
    speedMult: number
    xpMult: number
    pickupRangeMult: number
    bulletLifetimeMult: number
    bodyDamageMult: number

    // Additive stat modifiers
    flatDamage: number
    flatHealth: number
    flatSpeed: number
    flatRegen: number
    flatArmor: number
    thornsPercent: number
    lifestealPercent: number
    dodgeChance: number
    critChance: number
    critMult: number

    // Bullet mechanic flags
    bulletCount: number          // extra bullets per shot
    pierceCount: number          // extra pierce
    bounceCount: number          // wall bounces
    chainCount: number           // chain to nearby enemies
    explosiveRadius: number      // explosion on hit
    homingStrength: number       // homing factor
    poisonDamage: number         // DoT per second
    poisonDuration: number
    freezeChance: number
    freezeDuration: number

    // Special mechanic flags
    fireTrail: boolean
    orbitalBullets: number       // num orbiting bullets
    orbitalDamage: number
    orbitalSpeed: number
    shadowClones: number
    shieldOrbs: number
    magneticField: boolean
    magneticDamage: number
    bulletsSplit: number         // split into N on hit
    bulletsGrow: boolean         // bullets grow over time
    reverseShot: boolean         // also fire backwards
    zapOnKill: number            // chain damage on kill
    healOnKill: number
    xpOnKill: number
    explodeOnDeath: boolean
    dvdBounce: boolean           // player bounces off walls
    rampage: boolean             // kill streak increases damage
    berserk: boolean             // more dmg at low HP
    timeWarpOnKill: boolean
    vampiricBullets: boolean     // bullets heal on hit
    meteorShower: boolean
    auraOfDecay: boolean         // nearby enemies take damage
    auraRadius: number
    auraDamage: number
}

export interface MutationDef {
    id: string
    name: string
    desc: string
    icon: string                 // emoji icon
    rarity: MutationRarity
    category: MutationCategory
    maxStacks: number
    effects: Partial<MutationEffects>
    conflicts?: string[]         // mutation IDs that conflict
}

export interface ActiveMutation {
    def: MutationDef
    stacks: number
}

export interface MutatorDef {
    id: string
    name: string
    desc: string
    icon: string
    scoreMultiplier: number      // e.g. 1.5 = +50% score
    effects: Partial<MutationEffects>
    enemyHpMult?: number
    enemyDamageMult?: number
    enemySpeedMult?: number
    enemyCountMult?: number
    arenaScale?: number          // 0.5 = half size arena
}

// ======= CORE TYPES =======

export interface Player {
    id: string
    name: string
    color: string
    alive: boolean
    x: number; y: number
    vx: number; vy: number
    angle: number
    health: number; maxHealth: number
    shield: number; maxShield: number
    speed: number
    size: number
    baseSize: number
    playerClassStr: string
    classDef: ClassDef
    xp: number
    level: number
    skillPoints: number
    stats: PlayerStats
    statLevels: PlayerStats
    weapon: WeaponType
    weaponAmmo: { [key in WeaponType]: number }
    fireTimers: number[]
    damage: number
    dashCooldown: number; dashTimer: number
    isDashing: boolean; dashDirection: Vector2
    ability: AbilityType; abilityCooldown: number
    invincible: number
    damageBoost: number
    rapidFire: number
    thrusterParticles: Particle[]
    mutations: ActiveMutation[]
    pendingMutations: number
    computedEffects: MutationEffects
    killStreak: number
    killStreakTimer: number
    noDamageTimer: number
    orbitalAngle: number
    fireTrailTimer: number
    meteorTimer: number
    auraTimer: number
}

export type EnemyBehaviorConfig = {
    type: 'chase' | 'kite' | 'circle' | 'snipe' | 'charge' | 'spawn' | 'bomb' | 'teleport' | 'heal' | 'artillery' | 'orbit'
    range?: number
    orbitRadius?: number
}

export interface EnemyDef {
    type: string
    health: number
    size: number
    damage: number
    points: number
    money: number
    fireRate: number
    behaviors: EnemyBehaviorConfig[]
    speed: number
    color: string
    shape: 'circle' | 'square' | 'triangle' | 'octagon' | 'star'
    boss: boolean
    spawnTypes?: string[]
}

export interface Enemy {
    id: string
    x: number; y: number
    vx: number; vy: number
    angle: number
    health: number; maxHealth: number
    def: EnemyDef
    fireTimer: number
    behaviorTimer: number
    phase: number
    targetX: number; targetY: number
    spawnTime: number
    color: string
    poisonTimer: number
    poisonDamage: number
    freezeTimer: number
    spawnAnimTimer: number
    hitFlashTimer: number
}

export interface Bullet {
    id: string
    x: number; y: number
    vx: number; vy: number
    size: number
    baseSize: number
    damage: number
    isPlayer: boolean
    ownerId: string  // player ID who fired this bullet (for PvP)
    color: string
    trail: Vector2[]
    hits: number
    maxHits: number
    hitEnemies: string[]
    piercing: boolean
    explosive: boolean
    lifetime: number
    bounces: number
    chains: number
    homingStrength: number
    poisonDamage: number
    poisonDuration: number
    freezeChance: number
    freezeDuration: number
    growRate: number
    age: number
}

export interface XpOrb {
    x: number; y: number
    vx: number; vy: number
    value: number
    size: number
    magnetTimer: number
    alpha: number
    color: string
}

export interface PowerUp {
    x: number; y: number
    type: 'health' | 'shield' | 'damage' | 'rapid' | 'ammo' | 'money' | 'ability' | 'xp'
    size: number
    bobPhase: number
    glowIntensity: number
    value: number
}

export interface Particle {
    x: number; y: number
    vx: number; vy: number
    life: number; maxLife: number
    size: number
    color: string
    type: 'spark' | 'smoke' | 'explosion' | 'trail' | 'glow' | 'xp' | 'fire' | 'frost' | 'poison' | 'orbital' | 'aura' | 'levelup' | 'ring'
    alpha: number
}

export interface DamageNumber {
    x: number; y: number
    value: number
    vy: number
    life: number
    color: string
    scale: number
}

export interface ShopItem {
    id: string
    name: string
    description: string
    cost: number
    type: 'weapon' | 'ability' | 'upgrade' | 'consumable'
    icon: string
    maxLevel?: number
    currentLevel?: number
}

export interface GameData {
    state: GameState
    difficulty: Difficulty
    gameTime: number
    nextBossTime: number
    score: number
    money: number
    totalMoney: number
    highScore: number
    combo: number; comboTimer: number
    screenShake: number
    screenFlash: number
    screenFlashColor: string
    players: Player[]
    localPlayerId: string
    enemies: Enemy[]
    bullets: Bullet[]
    powerUps: PowerUp[]
    particles: Particle[]
    damageNumbers: DamageNumber[]
    xpOrbs: XpOrb[]
    spawnTimer: number
    bossActive: boolean
    autoFire: boolean
    bossWarningTimer: number
    dpsTracker: { damage: number; time: number }[]
    peakDps: number
    totalDamageDealt: number
    totalHealingDone: number
    longestKillStreak: number
    timeScale: number
    slowTimer: number
    killStreak: number
    killStreakTimer: number
    camera: { x: number; y: number }
    shopItems: ShopItem[]
    purchasedUpgrades: { [key: string]: number }
    unlockedWeapons: WeaponType[]
    unlockedAbilities: AbilityType[]
    sfxVolume: number
    musicVolume: number
    screenShakeEnabled: boolean
    particlesEnabled: boolean
    totalKills: number
    totalDamage: number

    // Multiplayer
    isMultiplayer: boolean
    isHost: boolean
    roomId: string | null
    gameMode: 'solo_endless' | 'solo_waves' | 'ffa' | 'coop' | 'story'

    wave: number
    waveTimer: number
    waveActive: boolean

    // Mutation system
    mutationDraft: MutationDef[]
    activeMutators: MutatorDef[]
    scoreMultiplier: number
    mutatorEnemyHpMult: number
    mutatorEnemyDmgMult: number
    mutatorEnemySpdMult: number
    mutatorEnemyCountMult: number

    // Reroll & tracking
    rerollsRemaining: number
    totalBulletsFired: number
    fovScale: number

    // Story mode
    storyChapter: number
    storyDialogue: string[]
    storyDialogueTimer: number
    storyBossDefeated: boolean

    // Visual
    bgPhase: number
    debrisItems: { x: number; y: number; angle: number; size: number; speed: number; shape: number }[]
}
