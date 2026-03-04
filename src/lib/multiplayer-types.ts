// ======= MULTIPLAYER TYPES =======

export type GameMode = 'ffa' | 'coop' | 'solo'

export interface RoomInfo {
    id: string
    hostId: string
    mode: GameMode
    players: RoomPlayer[]
    maxPlayers: number
    state: 'lobby' | 'playing' | 'finished'
}

export interface RoomPlayer {
    id: string
    name: string
    color: string
    ready: boolean
    isHost: boolean
}

export interface PlayerInput {
    playerId: string
    keys: Record<string, boolean>
    mouseX: number
    mouseY: number
    mouseDown: boolean
    angle: number
    autoFire: boolean
    seq: number // sequence number for ordering
    actions?: { type: string; payload: any }[] // deferred actions like upgrades
}

// Stripped-down player data sent over the wire
export interface NetPlayer {
    id: string
    name: string
    x: number; y: number
    vx: number; vy: number
    angle: number
    health: number; maxHealth: number
    shield: number; maxShield: number
    size: number
    classId: string
    classColor: string
    level: number
    score: number
    alive: boolean
    killStreak: number
    fireTimers: number[]
    mutations: { id: string; icon: string; stacks: number }[]
    pendingMutations?: number
}

export interface NetEnemy {
    id: string
    x: number; y: number
    vx: number; vy: number
    angle: number
    health: number; maxHealth: number
    type: string
    color: string
    freezeTimer: number
    poisonTimer: number
    spawnAnimTimer: number
    hitFlashTimer: number
}

export interface NetBullet {
    x: number; y: number
    vx: number; vy: number
    size: number
    damage: number
    isPlayer: boolean
    color: string
    ownerId: string // which player fired it (for PvP)
    trail: { x: number; y: number }[]
}

export interface NetXpOrb {
    x: number; y: number
    vx: number; vy: number
    value: number
    size: number
    color: string
    alpha: number
}

export interface NetPowerUp {
    x: number; y: number
    type: string
    size: number
    bobPhase: number
    glowIntensity: number
}

export interface NetParticle {
    x: number; y: number
    vx: number; vy: number
    life: number; maxLife: number
    size: number
    color: string
    type: string
    alpha: number
}

export interface NetDamageNumber {
    x: number; y: number
    value: number
    vy: number
    life: number
    color: string
    scale: number
}

export interface GameSnapshot {
    seq: number
    gameTime: number
    players: NetPlayer[]
    enemies: NetEnemy[]
    bullets: NetBullet[]
    xpOrbs: NetXpOrb[]
    powerUps: NetPowerUp[]
    particles: NetParticle[]
    damageNumbers: NetDamageNumber[]
    score: number
    bossActive: boolean
    bossWarningTimer: number
    screenShake: number
    screenFlash: number
    screenFlashColor: string
    gameMode: GameMode
    worldWidth: number
    worldHeight: number
}

// ======= NETWORK MESSAGES =======

export type ClientMessage =
    | { type: 'create_room'; name: string; mode: GameMode }
    | { type: 'join_room'; roomId: string; name: string }
    | { type: 'leave_room' }
    | { type: 'player_ready' }
    | { type: 'start_game' }
    | { type: 'input'; input: PlayerInput }
    | { type: 'snapshot'; snapshot: GameSnapshot }
    | { type: 'list_rooms' }
    | { type: 'chat'; message: string }

export type ServerMessage =
    | { type: 'room_created'; room: RoomInfo; playerId: string }
    | { type: 'room_joined'; room: RoomInfo; playerId: string }
    | { type: 'room_updated'; room: RoomInfo }
    | { type: 'room_list'; rooms: RoomInfo[] }
    | { type: 'player_joined'; player: RoomPlayer }
    | { type: 'player_left'; playerId: string }
    | { type: 'game_starting'; room: RoomInfo }
    | { type: 'input'; input: PlayerInput }
    | { type: 'snapshot'; snapshot: GameSnapshot }
    | { type: 'chat'; playerId: string; name: string; message: string }
    | { type: 'error'; message: string }

// Player color palette for multiplayer
export const PLAYER_COLORS = [
    '#00ccff', // cyan (host)
    '#ff4488', // pink
    '#44ff88', // green
    '#ffaa00', // orange
]
