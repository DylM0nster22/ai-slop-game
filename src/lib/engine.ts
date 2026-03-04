import { GameData, Player, Vector2, Bullet, Particle, DamageNumber, PowerUp, Enemy, PlayerStats, MutationEffects, ActiveMutation, MutatorDef, MutationDef, XpOrb } from './types'
import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, lerp, dist, angle, clamp, pick, rnd, rndInt, chance } from './utils'
import { CLASS_TREE } from './classes'
import { ENEMY_TYPES } from './enemies'
import { defaultEffects, pickMutationDraft } from './mutations'
import { sfx, initAudio } from './sounds'
import type { PlayerInput } from './multiplayer-types'

export class GameEngine {
    public data: GameData
    public mouse: { x: number; y: number; down: boolean; clicked: boolean } = { x: 0, y: 0, down: false, clicked: false }
    public keys: Record<string, boolean> = {}
    public remoteInputs: Map<string, PlayerInput> = new Map()
    private worldW = WORLD_WIDTH
    private worldH = WORLD_HEIGHT

    constructor() {
        this.data = this.createInitialData()
    }

    get localPlayer(): Player {
        return this.data.players.find(p => p.id === this.data.localPlayerId) || this.data.players[0]
    }

    get alivePlayers(): Player[] {
        return this.data.players.filter(p => p.alive)
    }

    nearestPlayer(x: number, y: number): Player {
        let best = this.data.players[0]
        let bestD = Infinity
        for (const p of this.alivePlayers) {
            const d = dist(x, y, p.x, p.y)
            if (d < bestD) { bestD = d; best = p }
        }
        return best
    }

    nearestOtherPlayer(x: number, y: number, excludeId: string): Player | null {
        let best: Player | null = null
        let bestD = Infinity
        for (const p of this.alivePlayers) {
            if (p.id === excludeId) continue
            const d = dist(x, y, p.x, p.y)
            if (d < bestD) { bestD = d; best = p }
        }
        return best
    }

    createInitialData(): GameData {
        const localId = 'local_' + Math.random().toString(36).substr(2, 6)
        return {
            state: 'title', difficulty: 'normal', gameTime: 0, nextBossTime: 60, score: 0, money: 0, totalMoney: 0,
            highScore: typeof window !== 'undefined' ? parseInt(localStorage.getItem('botArenaHighScore') || '0') : 0,
            combo: 0, comboTimer: 0, screenShake: 0, screenFlash: 0, screenFlashColor: '#fff',
            players: [this.createPlayer('basic', localId, 'Player', '#00ccff')],
            localPlayerId: localId,
            enemies: [], bullets: [], powerUps: [], particles: [], damageNumbers: [],
            xpOrbs: [],
            spawnTimer: 1, bossActive: false,
            autoFire: false,
            bossWarningTimer: 0,
            wave: 1, waveTimer: 60, waveActive: true,
            dpsTracker: [],
            peakDps: 0,
            totalDamageDealt: 0,
            totalHealingDone: 0,
            longestKillStreak: 0,
            timeScale: 1, slowTimer: 0, killStreak: 0, killStreakTimer: 0,
            camera: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 },
            shopItems: [], purchasedUpgrades: {}, unlockedWeapons: ['standard'], unlockedAbilities: ['none'],
            sfxVolume: 0.7, musicVolume: 0.5, screenShakeEnabled: true, particlesEnabled: true,
            totalKills: 0, totalDamage: 0,
            isMultiplayer: false, isHost: true, roomId: null, gameMode: 'solo_endless',
            mutationDraft: [], activeMutators: [], scoreMultiplier: 1,
            mutatorEnemyHpMult: 1, mutatorEnemyDmgMult: 1, mutatorEnemySpdMult: 1, mutatorEnemyCountMult: 1,
            bgPhase: 0,
            debrisItems: Array.from({ length: 20 }, () => ({
                x: rnd(0, WORLD_WIDTH), y: rnd(0, WORLD_HEIGHT),
                angle: rnd(0, Math.PI * 2), size: rnd(3, 12), speed: rnd(0.1, 0.5),
                shape: rndInt(0, 3)
            })),
        }
    }

    createPlayer(classId: string, id?: string, name?: string, color?: string): Player {
        const def = CLASS_TREE[classId] || CLASS_TREE['basic']
        const spawnOffset = this.data ? this.data.players.length * 80 : 0
        return {
            id: id || 'p_' + Math.random().toString(36).substr(2, 6),
            name: name || 'Player',
            color: color || '#00ccff',
            alive: true,
            x: this.worldW / 2 + spawnOffset, y: this.worldH / 2,
            vx: 0, vy: 0, angle: 0,
            health: 100 * def.healthMult, maxHealth: 100 * def.healthMult,
            shield: 0, maxShield: 50,
            speed: 5 * def.speedMult, size: 35, baseSize: 35,
            playerClassStr: classId,
            classDef: def,
            xp: 0, level: 1, skillPoints: 0,
            stats: { healthRegen: 0, maxHealth: 0, bodyDamage: 0, bulletSpeed: 0, bulletPenetration: 0, bulletDamage: 0, reload: 0, movementSpeed: 0 },
            statLevels: { healthRegen: 0, maxHealth: 0, bodyDamage: 0, bulletSpeed: 0, bulletPenetration: 0, bulletDamage: 0, reload: 0, movementSpeed: 0 },
            weapon: 'standard', weaponAmmo: { standard: Infinity, spread: 100, laser: 150, rockets: 30, plasma: 80 },
            fireTimers: new Array(def.barrels.length).fill(0),
            damage: 20 * def.damageMult,
            dashCooldown: 0, dashTimer: 0, isDashing: false, dashDirection: { x: 0, y: 0 },
            ability: 'none', abilityCooldown: 0, invincible: 0, damageBoost: 0, rapidFire: 0,
            thrusterParticles: [],
            mutations: [], pendingMutations: 0,
            computedEffects: defaultEffects(),
            killStreak: 0, killStreakTimer: 0,
            noDamageTimer: 0,
            orbitalAngle: 0, fireTrailTimer: 0, meteorTimer: 0, auraTimer: 0,
        }
    }

    addPlayer(id: string, name: string, color: string): Player {
        const p = this.createPlayer('basic', id, name, color)
        this.data.players.push(p)
        return p
    }

    removePlayer(id: string) {
        this.data.players = this.data.players.filter(p => p.id !== id)
        this.remoteInputs.delete(id)
    }

    applyRemoteInput(input: PlayerInput) {
        this.remoteInputs.set(input.playerId, input)

        // Process any one-off actions the client sent (like upgrades)
        if (input.actions && input.actions.length > 0) {
            const p = this.data.players.find(pl => pl.id === input.playerId)
            if (p) {
                input.actions.forEach(action => {
                    if (action.type === 'upgrade_stat') {
                        if (p.skillPoints > 0 && p.statLevels[action.payload as keyof PlayerStats] < 12) {
                            p.skillPoints--
                            p.statLevels[action.payload as keyof PlayerStats]++
                            this.recalculateStats(p)
                        }
                    } else if (action.type === 'upgrade_class') {
                        const newClassId = action.payload
                        const def = CLASS_TREE[newClassId]
                        if (def) {
                            p.playerClassStr = newClassId
                            p.classDef = def
                            p.fireTimers = new Array(def.barrels.length).fill(0)
                            this.recomputeMutationEffects(p)
                            this.spawnExplosion(p.x, p.y, def.color, 3)
                        }
                    } else if (action.type === 'add_mutation') {
                        const def = action.payload
                        const existing = p.mutations.find(m => m.def.id === def.id)
                        if (existing && existing.stacks < def.maxStacks) {
                            existing.stacks++
                        } else if (!existing) {
                            p.mutations.push({ def, stacks: 1 })
                        }
                        p.pendingMutations = Math.max(0, p.pendingMutations - 1)
                        this.recomputeMutationEffects(p)
                    }
                })
            }
        }
    }

    private snapshotSeq = 0

    createSnapshot(): any {
        const d = this.data
        const r1 = (n: number) => Math.round(n * 10) / 10
        const r0 = (n: number) => Math.round(n)
        return {
            seq: this.snapshotSeq++,
            gameTime: r1(d.gameTime),
            players: d.players.map(p => ({
                id: p.id, name: p.name, x: r0(p.x), y: r0(p.y), vx: r1(p.vx), vy: r1(p.vy),
                angle: r1(p.angle), health: r0(p.health), maxHealth: r0(p.maxHealth),
                size: r0(p.size),
                classId: p.playerClassStr, classColor: p.classDef.color,
                level: p.level, xp: r0(p.xp), skillPoints: p.skillPoints, alive: p.alive, killStreak: p.killStreak,
                color: p.color,
                statLevels: { ...p.statLevels },
                pendingMutations: p.pendingMutations,
                mutations: p.mutations.map(m => ({ id: m.def.id, icon: m.def.icon, stacks: m.stacks })),
            })),
            enemies: d.enemies.map(e => {
                const defId = Object.keys(ENEMY_TYPES).find(k => ENEMY_TYPES[k] === e.def) || 'drone'
                return {
                    id: e.id, x: r0(e.x), y: r0(e.y), vx: r1(e.vx), vy: r1(e.vy), angle: r1(e.angle),
                    health: r0(e.health), maxHealth: r0(e.maxHealth), type: e.def.shape,
                    color: e.color, freezeTimer: r1(e.freezeTimer),
                    spawnAnimTimer: r1(e.spawnAnimTimer), hitFlashTimer: r1(e.hitFlashTimer),
                    defId
                }
            }),
            bullets: d.bullets.map(b => ({
                id: b.id, x: r0(b.x), y: r0(b.y), vx: r1(b.vx), vy: r1(b.vy), size: r1(b.size), baseSize: r1(b.baseSize),
                isPlayer: b.isPlayer, color: b.color,
                ownerId: b.ownerId, trail: b.trail.slice(-1).map(t => ({ x: r0(t.x), y: r0(t.y) })),
                lifetime: r1(b.lifetime),
                growRate: r1(b.growRate), age: r1(b.age),
            })),
            xpOrbs: d.xpOrbs.map(o => ({ x: r0(o.x), y: r0(o.y), vx: r1(o.vx), vy: r1(o.vy), value: o.value, size: r1(o.size), color: o.color, alpha: r1(o.alpha), magnetTimer: r1(o.magnetTimer) })),
            powerUps: d.powerUps.map(p => ({ x: r0(p.x), y: r0(p.y), type: p.type, size: r1(p.size), bobPhase: r1(p.bobPhase), glowIntensity: r1(p.glowIntensity), value: r1(p.value) })),
            particles: d.particles.slice(-30).map(p => ({ x: r0(p.x), y: r0(p.y), vx: r1(p.vx), vy: r1(p.vy), life: r1(p.life), maxLife: r1(p.maxLife), size: r1(p.size), color: p.color, type: p.type, alpha: r1(p.alpha) })),
            damageNumbers: d.damageNumbers.map(dn => ({ x: r0(dn.x), y: r0(dn.y), value: r0(dn.value), vy: r1(dn.vy), life: r1(dn.life), color: dn.color, scale: r1(dn.scale) })),
            score: r0(d.score),
            bossActive: d.bossActive,
            bossWarningTimer: r1(d.bossWarningTimer),
            screenShake: r1(d.screenShake),
            screenFlash: r1(d.screenFlash),
            screenFlashColor: d.screenFlashColor,
            gameMode: d.gameMode,
            worldWidth: r0(this.worldW),
            worldHeight: r0(this.worldH),
            totalKills: d.totalKills,
            state: d.state,
            wave: d.wave,
            waveTimer: r0(d.waveTimer),
            waveActive: d.waveActive,
        }
    }

    applySnapshot(snapshot: any) {
        const d = this.data
        d.gameTime = snapshot.gameTime
        d.score = snapshot.score
        d.bossActive = snapshot.bossActive
        d.bossWarningTimer = snapshot.bossWarningTimer
        d.screenShake = snapshot.screenShake
        d.screenFlash = snapshot.screenFlash
        d.screenFlashColor = snapshot.screenFlashColor
        d.totalKills = snapshot.totalKills
        if (snapshot.state === 'gameover' || snapshot.state === 'playing' || snapshot.state === 'shop') {
            const isLocalSelecting = this.data.state === 'class_select' || this.data.state === 'mutation_draft'
            // If the local client is actively picking a mutation or class, don't let a generic playing/shop snapshot rip them out of it
            if (!isLocalSelecting) {
                this.data.state = snapshot.state
            }
        }
        if (snapshot.wave !== undefined) d.wave = snapshot.wave
        if (snapshot.waveTimer !== undefined) d.waveTimer = snapshot.waveTimer
        if (snapshot.waveActive !== undefined) d.waveActive = snapshot.waveActive

        // Update players
        snapshot.players.forEach((sp: any) => {
            let p = d.players.find(pl => pl.id === sp.id)
            if (!p) {
                p = this.createPlayer(sp.classId || 'basic', sp.id, sp.name, sp.color)
                d.players.push(p)
            }
            p.x = sp.x; p.y = sp.y; p.vx = sp.vx; p.vy = sp.vy
            p.angle = sp.angle; p.health = sp.health; p.maxHealth = sp.maxHealth
            p.size = sp.size; p.alive = sp.alive; p.level = sp.level
            if (sp.xp !== undefined) p.xp = sp.xp
            if (sp.skillPoints !== undefined) p.skillPoints = sp.skillPoints
            if (sp.statLevels) p.statLevels = sp.statLevels
            if (sp.pendingMutations !== undefined) p.pendingMutations = sp.pendingMutations
            p.killStreak = sp.killStreak; p.name = sp.name; p.color = sp.color
            // Reconstruct classDef if class changed
            if (sp.classId && sp.classId !== p.playerClassStr) {
                p.playerClassStr = sp.classId
                p.classDef = CLASS_TREE[sp.classId] || CLASS_TREE['basic']
                p.fireTimers = new Array(p.classDef.barrels.length).fill(0)
            }
        })
        // Remove players that are no longer in the snapshot
        d.players = d.players.filter(p => snapshot.players.some((sp: any) => sp.id === p.id))

        // Overwrite world state — reconstruct enemy defs from ENEMY_TYPES
        d.enemies = snapshot.enemies.map((se: any) => {
            let def = se.def
            if (!def || !def.behaviors) {
                // Reconstruct from defId or match by shape
                if (se.defId && ENEMY_TYPES[se.defId]) {
                    def = ENEMY_TYPES[se.defId]
                } else {
                    const typeKey = Object.keys(ENEMY_TYPES).find(k => ENEMY_TYPES[k].shape === se.type)
                    def = typeKey ? ENEMY_TYPES[typeKey] : ENEMY_TYPES[Object.keys(ENEMY_TYPES)[0]]
                }
            }
            return { ...se, def }
        })
        const newBullets: Bullet[] = []
        snapshot.bullets.forEach((sb: any) => {
            const existing = d.bullets.find(eb => eb.id === sb.id)
            if (existing) {
                sb.trail = [...existing.trail, ...sb.trail].slice(-8)
            } else {
                sb.trail = []
            }
            newBullets.push(sb as Bullet)
        })
        d.bullets = newBullets
        d.xpOrbs = snapshot.xpOrbs
        d.powerUps = snapshot.powerUps
        d.particles = snapshot.particles
        d.damageNumbers = snapshot.damageNumbers

        // Update world dimensions from host
        if (snapshot.worldWidth) this.worldW = snapshot.worldWidth
        if (snapshot.worldHeight) this.worldH = snapshot.worldHeight

        // Camera follows local player with smooth interpolation
        const lp = d.players.find(p => p.id === d.localPlayerId)
        if (lp) {
            d.camera.x = lerp(d.camera.x, lp.x, 0.15)
            d.camera.y = lerp(d.camera.y, lp.y, 0.15)
        }
    }

    startGame(mode: 'solo_endless' | 'solo_waves' | 'ffa' | 'coop' = 'solo_endless') {
        initAudio()
        sfx.click()
        const hs = this.data.highScore
        const localId = this.data.localPlayerId
        const isMP = this.data.isMultiplayer
        const isHost = this.data.isHost
        const roomId = this.data.roomId
        const existingPlayers = this.data.players
        this.data = this.createInitialData()
        this.data.highScore = hs
        this.data.localPlayerId = localId
        this.data.isMultiplayer = isMP
        this.data.isHost = isHost
        this.data.roomId = roomId
        this.data.gameMode = mode
        if (isMP && existingPlayers.length > 1) {
            this.data.players = existingPlayers.map(p => this.createPlayer('basic', p.id, p.name, p.color))
        } else {
            // Keep the stable local ID for the initial player
            this.data.players[0].id = localId
        }
        this.data.state = 'mutator_select'
    }

    startNextWave() {
        this.data.wave++
        this.data.waveTimer = 60
        this.data.waveActive = true
        this.data.state = 'playing'

        // Revive dead players and place them in the center
        this.data.players.forEach(p => {
            if (!p.alive) {
                p.alive = true
                p.health = p.maxHealth
                p.x = 0
                p.y = 0
                p.vx = 0
                p.vy = 0
                p.invincible = 3 // 3 seconds of invulnerability
            }
        })
    }

    startGameAfterMutators() {
        // Apply mutators to data
        let scoreMult = 1
        let eHp = 1, eDmg = 1, eSpd = 1, eCount = 1
        const playerEffects: Partial<MutationEffects> = {}
        let arenaScale = 1

        this.data.activeMutators.forEach(m => {
            scoreMult *= m.scoreMultiplier
            if (m.enemyHpMult) eHp *= m.enemyHpMult
            if (m.enemyDamageMult) eDmg *= m.enemyDamageMult
            if (m.enemySpeedMult) eSpd *= m.enemySpeedMult
            if (m.enemyCountMult) eCount *= m.enemyCountMult
            if (m.arenaScale) arenaScale *= m.arenaScale
            // Merge player-affecting effects
            for (const [k, v] of Object.entries(m.effects)) {
                if (typeof v === 'number') {
                    const cur = (playerEffects as any)[k] || (v > 0.5 && v < 2 ? 1 : 0)
                    if (v > 0.5 && v < 2) (playerEffects as any)[k] = cur * v
                    else (playerEffects as any)[k] = cur + v
                } else if (typeof v === 'boolean' && v) {
                    (playerEffects as any)[k] = true
                }
            }
        })

        this.data.scoreMultiplier = scoreMult
        this.data.mutatorEnemyHpMult = eHp
        this.data.mutatorEnemyDmgMult = eDmg
        this.data.mutatorEnemySpdMult = eSpd
        this.data.mutatorEnemyCountMult = eCount

        this.worldW = Math.floor(WORLD_WIDTH * arenaScale)
        this.worldH = Math.floor(WORLD_HEIGHT * arenaScale)
        this.data.players.forEach(pl => {
            pl.x = this.worldW / 2 + this.data.players.indexOf(pl) * 80
            pl.y = this.worldH / 2
        })
        this.data.camera.x = this.worldW / 2
        this.data.camera.y = this.worldH / 2

        this.recomputeMutationEffects()
        this.data.state = 'playing'
    }

    toggleMutator(mutator: MutatorDef) {
        const idx = this.data.activeMutators.findIndex(m => m.id === mutator.id)
        if (idx >= 0) this.data.activeMutators.splice(idx, 1)
        else this.data.activeMutators.push(mutator)
    }

    // === MUTATION SYSTEM ===

    addMutation(def: MutationDef) {
        const lp = this.localPlayer
        const existing = lp.mutations.find(m => m.def.id === def.id)
        if (existing && existing.stacks < def.maxStacks) {
            existing.stacks++
        } else if (!existing) {
            lp.mutations.push({ def, stacks: 1 })
        }
        this.recomputeMutationEffects()
        this.data.state = 'playing'
    }

    recomputeMutationEffects(targetPlayer?: Player) {
        const eff = defaultEffects()
        const p = targetPlayer || this.localPlayer

        p.mutations.forEach(am => {
            for (let s = 0; s < am.stacks; s++) {
                for (const [k, v] of Object.entries(am.def.effects)) {
                    if (typeof v === 'number') {
                        const cur = (eff as any)[k]
                        if (typeof cur === 'number') {
                            // Multiplicative (values close to 1.0)
                            if (cur > 0.1 && cur < 10 && v > 0.1 && v < 10 && ['damageMult', 'fireRateMult', 'bulletSpeedMult', 'bulletSizeMult', 'maxHealthMult', 'regenMult', 'speedMult', 'xpMult', 'pickupRangeMult', 'bulletLifetimeMult', 'bodyDamageMult', 'critMult'].includes(k)) {
                                ; (eff as any)[k] = cur * v
                            } else {
                                ; (eff as any)[k] = cur + v
                            }
                        }
                    } else if (typeof v === 'boolean' && v) {
                        ; (eff as any)[k] = true
                    }
                }
            }
        })

        // Apply mutator player effects too
        this.data.activeMutators.forEach(m => {
            for (const [k, v] of Object.entries(m.effects)) {
                if (typeof v === 'number') {
                    const cur = (eff as any)[k]
                    if (typeof cur === 'number') {
                        if (['damageMult', 'fireRateMult', 'bulletSpeedMult', 'bulletSizeMult', 'maxHealthMult', 'regenMult', 'speedMult', 'xpMult', 'pickupRangeMult', 'bulletLifetimeMult', 'bodyDamageMult', 'critMult'].includes(k)) {
                            ; (eff as any)[k] = cur * v
                        } else {
                            ; (eff as any)[k] = cur + v
                        }
                    }
                } else if (typeof v === 'boolean' && v) {
                    ; (eff as any)[k] = true
                }
            }
        })

        p.computedEffects = eff
        this.recalculateStats()
    }

    // --- Core ---

    upgradeClass(newClassId: string) {
        const def = CLASS_TREE[newClassId]
        if (!def) return
        const lp = this.localPlayer
        lp.playerClassStr = newClassId
        lp.classDef = def
        lp.fireTimers = new Array(def.barrels.length).fill(0)
        this.recomputeMutationEffects()

        this.spawnExplosion(lp.x, lp.y, def.color, 3)
        this.data.state = 'playing'
    }

    upgradeStat(statName: keyof PlayerStats) {
        const lp = this.localPlayer
        if (lp.skillPoints > 0 && lp.statLevels[statName] < 12) {
            lp.skillPoints--
            lp.statLevels[statName]++
            this.recalculateStats()
        }
    }

    recalculateStats(target?: Player) {
        const p = target || this.localPlayer
        const def = p.classDef
        const eff = p.computedEffects

        const hpPct = p.maxHealth > 0 ? p.health / p.maxHealth : 1
        p.maxHealth = (100 * def.healthMult + p.statLevels.maxHealth * 20 + eff.flatHealth) * eff.maxHealthMult
        p.health = p.maxHealth * hpPct

        p.speed = (5 * def.speedMult + p.statLevels.movementSpeed * 0.5 + eff.flatSpeed) * eff.speedMult
        p.damage = (20 * def.damageMult + p.statLevels.bulletDamage * 3 + eff.flatDamage) * eff.damageMult

        // Visual stat scaling: size grows with max HP
        p.size = p.baseSize * (0.8 + (p.maxHealth / 200) * 0.4)
        p.size = clamp(p.size, 20, 80) // don't go crazy
    }

    gainXp(amount: number, target?: Player) {
        const p = target || this.localPlayer
        const isLocal = p.id === this.data.localPlayerId
        const eff = p.computedEffects
        amount = Math.floor(amount * eff.xpMult + eff.xpOnKill)
        p.xp += amount
        const nextLevelReq = Math.floor(50 * Math.pow(1.12, p.level - 1) + p.level * 30)
        if (p.xp >= nextLevelReq) {
            p.level++
            p.skillPoints++
            p.xp -= nextLevelReq
            if (isLocal) sfx.levelUp()

            this.recalculateStats(p)

            if (this.data.gameMode !== 'solo_endless') {
                // Wave-based mode: accumulate levels for everyone
                p.pendingMutations++
            }
            // Class evolution and mutation drafts only for local player immediately (solo_endless) or when picking up
            if (isLocal) {
                if (this.data.gameMode === 'solo_endless') {
                    // Check for class evolution
                    if ([15, 30, 45, 60].includes(p.level) && p.classDef.upgradesTo.length > 0) {
                        this.data.state = 'class_select'
                        return
                    }

                    // Trigger mutation draft every level
                    this.data.mutationDraft = pickMutationDraft(p.mutations, 3, p.level)
                    if (this.data.mutationDraft.length > 0) {
                        this.data.state = 'mutation_draft'
                    }
                }
            }

            // Level up particles
            for (let i = 0; i < 30; i++) {
                const ang = (i / 30) * Math.PI * 2
                this.data.particles.push({
                    x: p.x, y: p.y,
                    vx: Math.cos(ang) * 5, vy: Math.sin(ang) * 5,
                    life: 0.8, maxLife: 0.8, size: 6,
                    color: '#00ffff', type: 'levelup', alpha: 1
                })
            }
        }
    }

    // --- Core Loop ---
    tick(dt: number) {
        if (this.data.state !== 'playing') return

        const time = dt * this.data.timeScale
        this.data.gameTime += time
        this.data.bgPhase += dt * 0.1

        if (this.data.gameMode !== 'solo_endless') {
            if (this.data.waveActive) {
                this.data.waveTimer -= time
                if (this.data.waveTimer <= 0) {
                    // End the wave
                    this.data.waveActive = false
                    this.data.bossActive = false
                    this.data.bossWarningTimer = 0
                    this.data.enemies.forEach(e => {
                        this.spawnExplosion(e.x, e.y, e.color, 2)
                    })
                    this.data.enemies = []
                    this.data.bullets = []
                    this.data.state = 'shop'
                }
            }
        }

        this.updateCamera()
        this.updatePlayer(time)
        this.updateRemotePlayers(time)
        this.updateEnemies(time)
        this.spawnStreamEnemies(time)
        this.updateBullets(time)
        this.updateXpOrbs(time)
        this.updateParticles(time)
        this.updateDamageNumbers(time)
        this.updatePowerUps(time)
        this.updateSpecialMutations(time)
        this.updateDebris(dt)

        // DPS tracker cleanup (rolling 5s window)
        const now = this.data.gameTime
        this.data.dpsTracker = this.data.dpsTracker.filter(d => now - d.time < 5)
        const currentDps = this.data.dpsTracker.reduce((s, d) => s + d.damage, 0) / 5
        if (currentDps > this.data.peakDps) this.data.peakDps = currentDps

        // Boss warning
        const timeUntilBoss = this.data.nextBossTime - this.data.gameTime
        if (timeUntilBoss > 0 && timeUntilBoss <= 5 && !this.data.bossActive) {
            if (this.data.bossWarningTimer <= 0) {
                this.data.bossWarningTimer = 5
                sfx.bossWarning()
            }
        }
        if (this.data.bossWarningTimer > 0) this.data.bossWarningTimer -= dt

        // Timers
        if (this.data.screenShake > 0) this.data.screenShake = Math.max(0, this.data.screenShake - dt * 20)
        if (this.data.screenFlash > 0) this.data.screenFlash = Math.max(0, this.data.screenFlash - dt * 2)
        if (this.data.slowTimer > 0) {
            this.data.slowTimer -= dt
            this.data.timeScale = 0.3
        } else {
            this.data.timeScale = 1
        }

        // Kill streak timer
        this.localPlayer.killStreakTimer -= dt
        if (this.localPlayer.killStreakTimer <= 0) {
            this.localPlayer.killStreak = 0
        }

        // No-damage timer
        this.localPlayer.noDamageTimer += dt
    }

    updateDebris(dt: number) {
        this.data.debrisItems.forEach(d => {
            d.angle += d.speed * dt * 0.5
            d.x += Math.cos(d.angle) * d.speed * dt * 60
            d.y += Math.sin(d.angle * 0.7) * d.speed * dt * 60
            if (d.x < -50) d.x = this.worldW + 50
            if (d.x > this.worldW + 50) d.x = -50
            if (d.y < -50) d.y = this.worldH + 50
            if (d.y > this.worldH + 50) d.y = -50
        })
    }

    updateCamera() {
        const p = this.localPlayer
        // Lead camera slightly toward mouse direction
        const screenPx = p.x - this.data.camera.x + CANVAS_WIDTH / 2
        const screenPy = p.y - this.data.camera.y + CANVAS_HEIGHT / 2
        const mouseDx = (this.mouse.x - CANVAS_WIDTH / 2) * 0.15
        const mouseDy = (this.mouse.y - CANVAS_HEIGHT / 2) * 0.15
        this.data.camera.x = lerp(this.data.camera.x, p.x + mouseDx, 0.08)
        this.data.camera.y = lerp(this.data.camera.y, p.y + mouseDy, 0.08)

        const halfW = CANVAS_WIDTH / 2
        const halfH = CANVAS_HEIGHT / 2
        this.data.camera.x = clamp(this.data.camera.x, halfW, this.worldW - halfW)
        this.data.camera.y = clamp(this.data.camera.y, halfH, this.worldH - halfH)
    }

    updatePlayer(dt: number) {
        const p = this.localPlayer
        if (!p.alive) return
        const eff = p.computedEffects

        let mx = 0, my = 0
        if (this.keys['w'] || this.keys['arrowup']) my = -1
        if (this.keys['s'] || this.keys['arrowdown']) my = 1
        if (this.keys['a'] || this.keys['arrowleft']) mx = -1
        if (this.keys['d'] || this.keys['arrowright']) mx = 1

        if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707 }

        p.vx = mx * p.speed
        p.vy = my * p.speed

        p.x = clamp(p.x + p.vx * dt * 60, p.size, this.worldW - p.size)
        p.y = clamp(p.y + p.vy * dt * 60, p.size, this.worldH - p.size)

        // DVD Bounce
        if (eff.dvdBounce) {
            if (p.x <= p.size || p.x >= this.worldW - p.size) p.vx *= -1.1
            if (p.y <= p.size || p.y >= this.worldH - p.size) p.vy *= -1.1
        }

        // Health Regen
        const baseRegen = p.statLevels.healthRegen * 2 + eff.flatRegen
        const regenRate = baseRegen * eff.regenMult
        if (regenRate > 0 && p.health < p.maxHealth) {
            p.health = Math.min(p.maxHealth, p.health + regenRate * dt)
        } else if (regenRate < 0) {
            p.health = Math.max(1, p.health + regenRate * dt)
        }

        // Mouse angle relative to camera
        const screenPx = p.x - this.data.camera.x + CANVAS_WIDTH / 2
        const screenPy = p.y - this.data.camera.y + CANVAS_HEIGHT / 2
        p.angle = angle(screenPx, screenPy, this.mouse.x, this.mouse.y)

        // Shooting
        for (let i = 0; i < p.fireTimers.length; i++) {
            p.fireTimers[i] += dt * 1000
        }

        if (this.mouse.down || this.data.autoFire) {
            p.classDef.barrels.forEach((barrel, i) => {
                const rate = (200 / (p.classDef.reloadMult * eff.fireRateMult)) * barrel.reloadRatio * Math.pow(0.85, p.statLevels.reload)
                if (p.fireTimers[i] >= rate) {
                    p.fireTimers[i] = 0
                    const spawnDist = p.size + barrel.length
                    const gunAngle = p.angle + barrel.angleOffset
                    const bx = p.x + Math.cos(gunAngle) * spawnDist + Math.cos(gunAngle + Math.PI / 2) * barrel.yOffset
                    const by = p.y + Math.sin(gunAngle) * spawnDist + Math.sin(gunAngle + Math.PI / 2) * barrel.yOffset
                    const bSpeed = 15 * p.classDef.bulletSpeedMult * barrel.speedRatio * (1 + p.statLevels.bulletSpeed * 0.15) * eff.bulletSpeedMult
                    let bDmg = p.damage * barrel.damageRatio

                    // Berserk: more damage at low HP
                    if (eff.berserk && p.health < p.maxHealth * 0.5) {
                        const hpRatio = p.health / p.maxHealth
                        bDmg *= 1 + (1 - hpRatio) * 2
                    }

                    // Rampage: kill streak increases damage
                    if (eff.rampage && p.killStreak > 0) {
                        bDmg *= 1 + Math.min(p.killStreak * 0.05, 1.0)
                    }

                    // Crit
                    let isCrit = false
                    let finalDmg = bDmg
                    if (eff.critChance > 0 && Math.random() < eff.critChance) {
                        finalDmg *= eff.critMult
                        isCrit = true
                    }

                    const finalAngle = gunAngle + (Math.random() - 0.5) * barrel.spread
                    const maxHits = 1 + p.statLevels.bulletPenetration + eff.pierceCount
                    const bulletSize = (barrel.width / 2) * eff.bulletSizeMult

                    // Main bullet
                    this.firePlayerBullet(bx, by, finalAngle, bSpeed, finalDmg, p.classDef.color, bulletSize, maxHits, isCrit)
                    sfx.shoot(p.classDef.bulletSpeedMult)

                    // Extra bullets from mutations
                    for (let eb = 0; eb < eff.bulletCount; eb++) {
                        const extraAngle = finalAngle + (Math.random() - 0.5) * 0.5
                        this.firePlayerBullet(bx, by, extraAngle, bSpeed * rnd(0.9, 1.1), finalDmg * 0.8, p.classDef.color, bulletSize * 0.8, maxHits, isCrit)
                    }

                    // Reverse shot
                    if (eff.reverseShot) {
                        this.firePlayerBullet(bx, by, finalAngle + Math.PI, bSpeed * 0.8, finalDmg * 0.6, p.classDef.color, bulletSize, maxHits, false)
                    }

                    p.x -= Math.cos(gunAngle) * barrel.recoil * 2
                    p.y -= Math.sin(gunAngle) * barrel.recoil * 2
                }
            })
        }
    }

    updateRemotePlayers(dt: number) {
        // Host-side: update remote players using their network inputs
        if (!this.data.isMultiplayer || !this.data.isHost) return
        for (const [playerId, input] of this.remoteInputs) {
            const p = this.data.players.find(pl => pl.id === playerId)
            if (!p || !p.alive || p.id === this.data.localPlayerId) continue

            // Movement from remote input
            let mx = 0, my = 0
            if (input.keys['w'] || input.keys['arrowup']) my = -1
            if (input.keys['s'] || input.keys['arrowdown']) my = 1
            if (input.keys['a'] || input.keys['arrowleft']) mx = -1
            if (input.keys['d'] || input.keys['arrowright']) mx = 1
            if (mx !== 0 && my !== 0) { mx *= 0.707; my *= 0.707 }

            p.vx = mx * p.speed
            p.vy = my * p.speed
            p.x = clamp(p.x + p.vx * dt * 60, p.size, this.worldW - p.size)
            p.y = clamp(p.y + p.vy * dt * 60, p.size, this.worldH - p.size)

            // Angle from remote input
            p.angle = input.angle

            // Remote shooting
            for (let i = 0; i < p.fireTimers.length; i++) p.fireTimers[i] += dt * 1000
            if (input.mouseDown || input.autoFire) {
                p.classDef.barrels.forEach((barrel, i) => {
                    const rate = (200 / p.classDef.reloadMult) * barrel.reloadRatio * Math.pow(0.85, p.statLevels.reload)
                    if (p.fireTimers[i] >= rate) {
                        p.fireTimers[i] = 0
                        const spawnDist = p.size + barrel.length
                        const gunAngle = p.angle + barrel.angleOffset
                        const bx = p.x + Math.cos(gunAngle) * spawnDist
                        const by = p.y + Math.sin(gunAngle) * spawnDist
                        const bSpeed = 15 * p.classDef.bulletSpeedMult * barrel.speedRatio * (1 + p.statLevels.bulletSpeed * 0.15)
                        const bDmg = p.damage * barrel.damageRatio
                        const finalAngle = gunAngle + (Math.random() - 0.5) * barrel.spread
                        const maxHits = 1 + p.statLevels.bulletPenetration
                        const bulletSize = barrel.width / 2
                        this.firePlayerBullet(bx, by, finalAngle, bSpeed, bDmg, p.classDef.color, bulletSize, maxHits, false, p.id, p.computedEffects)
                    }
                })
            }

            // Health regen
            const baseRegen = p.statLevels.healthRegen * 2
            if (baseRegen > 0 && p.health < p.maxHealth) {
                p.health = Math.min(p.maxHealth, p.health + baseRegen * dt)
            }
        }
    }

    firePlayerBullet(x: number, y: number, ang: number, speed: number, damage: number, color: string, size: number, maxHits: number, isCrit: boolean, ownerId?: string, ownerEffects?: MutationEffects) {
        const eff = ownerEffects || this.localPlayer.computedEffects
        this.data.bullets.push({
            id: Math.random().toString(36).substr(2, 6),
            x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
            size, baseSize: size, damage, isPlayer: true,
            ownerId: ownerId || this.localPlayer.id,
            color: isCrit ? '#ffff00' : color,
            trail: [], hits: 0, maxHits,
            hitEnemies: [], piercing: eff.pierceCount > 0, explosive: eff.explosiveRadius > 0,
            lifetime: 3 * eff.bulletLifetimeMult,
            bounces: eff.bounceCount,
            chains: eff.chainCount,
            homingStrength: eff.homingStrength,
            poisonDamage: eff.poisonDamage, poisonDuration: eff.poisonDuration,
            freezeChance: eff.freezeChance, freezeDuration: eff.freezeDuration,
            growRate: eff.bulletsGrow ? 0.5 : 0,
            age: 0,
        })
    }

    fireBullet(isPlayer: boolean, x: number, y: number, ang: number, speed: number, damage: number, color: string, size: number, maxHits: number = 1, ownerId: string = '') {
        this.data.bullets.push({
            id: Math.random().toString(36).substr(2, 6),
            x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
            size, baseSize: size, damage, isPlayer, ownerId, color,
            trail: [], hits: 0, maxHits,
            hitEnemies: [], piercing: false, explosive: false,
            lifetime: 3, bounces: 0, chains: 0, homingStrength: 0,
            poisonDamage: 0, poisonDuration: 0,
            freezeChance: 0, freezeDuration: 0,
            growRate: 0, age: 0,
        })
    }

    spawnEnemyAtAbs(typeId: string, x: number, y: number) {
        const def = ENEMY_TYPES[typeId]
        if (!def) return

        const timeMult = 1 + (this.data.gameTime / 60) * 0.5
        this.data.enemies.push({
            id: Math.random().toString(),
            x, y, vx: 0, vy: 0, angle: 0,
            health: def.health * timeMult * this.data.mutatorEnemyHpMult,
            maxHealth: def.health * timeMult * this.data.mutatorEnemyHpMult,
            def, fireTimer: 0, behaviorTimer: 0, phase: 0, targetX: 0, targetY: 0,
            spawnTime: Date.now(), color: def.color,
            poisonTimer: 0, poisonDamage: 0, freezeTimer: 0, spawnAnimTimer: 0.3, hitFlashTimer: 0,
        })
    }

    spawnStreamEnemies(dt: number) {
        if (this.data.gameMode !== 'solo_endless' && !this.data.waveActive) return;

        // Boss spawn logic
        const bossInterval = this.data.activeMutators.find(m => m.id === 'mut_double_boss') ? 20 : 60
        if (this.data.gameTime >= this.data.nextBossTime && !this.data.bossActive) {
            this.data.bossActive = true
            this.data.bossWarningTimer = 0
            this.data.nextBossTime += bossInterval

            // Spawn boss near a random alive player
            const targets = this.alivePlayers
            const p = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : this.localPlayer
            const ang = Math.random() * Math.PI * 2
            const distSq = rnd(800, 1200)

            const bossTypes = Object.keys(ENEMY_TYPES).filter(k => ENEMY_TYPES[k].boss)
            const bossType = bossTypes[Math.floor(Math.random() * bossTypes.length)] || 'boss_alpha'

            this.spawnEnemyAtAbs(bossType, clamp(p.x + Math.cos(ang) * distSq, 0, this.worldW), clamp(p.y + Math.sin(ang) * distSq, 0, this.worldH))
        }

        this.data.spawnTimer -= dt * this.data.mutatorEnemyCountMult
        if (this.data.spawnTimer <= 0) {
            this.data.spawnTimer = Math.max(0.2, 1.0 - (this.data.gameTime / 180) * 0.8)

            const keys = Object.keys(ENEMY_TYPES).filter(k => !ENEMY_TYPES[k].boss)
            const maxIdx = Math.floor(Math.min(keys.length, 5 + (this.data.gameTime / 15) * 2))
            const type = keys[Math.floor(Math.random() * maxIdx)]

            // Spawn near a random alive player
            const targets = this.alivePlayers
            const p = targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : this.localPlayer
            const ang = Math.random() * Math.PI * 2
            const distSq = rnd(600, 1000)
            this.spawnEnemyAtAbs(type, clamp(p.x + Math.cos(ang) * distSq, 0, this.worldW), clamp(p.y + Math.sin(ang) * distSq, 0, this.worldH))
        }
    }

    updateEnemies(dt: number) {
        this.data.enemies.forEach(e => {
            // Each enemy targets the nearest alive player
            const p = this.nearestPlayer(e.x, e.y)
            // Spawn animation
            if (e.spawnAnimTimer > 0) {
                e.spawnAnimTimer -= dt
                return
            }

            // Hit flash decay
            if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt

            // Freeze
            if (e.freezeTimer > 0) {
                e.freezeTimer -= dt
                return // frozen, can't act
            }

            // Poison damage
            if (e.poisonTimer > 0) {
                e.poisonTimer -= dt
                e.health -= e.poisonDamage * dt
                if (this.data.gameTime % 0.5 < dt) {
                    this.data.particles.push({
                        x: e.x + rnd(-e.def.size, e.def.size), y: e.y + rnd(-e.def.size, e.def.size),
                        vx: rnd(-1, 1), vy: -2, life: 0.5, maxLife: 0.5, size: 4,
                        color: '#88ff00', type: 'poison', alpha: 1
                    })
                }
            }

            const angToPlayer = angle(e.x, e.y, p.x, p.y)
            const d = dist(e.x, e.y, p.x, p.y)
            e.angle = angToPlayer

            const b = e.def.behaviors[0]
            let speed = e.def.speed * this.data.mutatorEnemySpdMult

            if (b.type === 'chase' || b.type === 'bomb') {
                e.vx = Math.cos(angToPlayer) * speed
                e.vy = Math.sin(angToPlayer) * speed
            } else if (b.type === 'kite' || b.type === 'artillery') {
                const range = b.range || 300
                if (d < range * 0.8) { e.vx = -Math.cos(angToPlayer) * speed; e.vy = -Math.sin(angToPlayer) * speed }
                else if (d > range * 1.2) { e.vx = Math.cos(angToPlayer) * speed; e.vy = Math.sin(angToPlayer) * speed }
                else { e.vx *= 0.9; e.vy *= 0.9 }
            } else if (b.type === 'orbit' || b.type === 'circle') {
                const rad = b.orbitRadius || 250
                const orbitAng = angToPlayer + Math.PI / 2
                const tx = p.x + Math.cos(angToPlayer) * rad
                const ty = p.y + Math.sin(angToPlayer) * rad
                const ta = angle(e.x, e.y, tx, ty)
                e.vx = Math.cos(ta) * speed + Math.cos(orbitAng) * speed * 0.5
                e.vy = Math.sin(ta) * speed + Math.sin(orbitAng) * speed * 0.5
            } else if (b.type === 'charge') {
                e.behaviorTimer -= dt
                if (e.behaviorTimer <= 0) { e.vx = Math.cos(angToPlayer) * speed * 5; e.vy = Math.sin(angToPlayer) * speed * 5; e.behaviorTimer = 2 }
                else { e.vx *= 0.95; e.vy *= 0.95 }
            } else if (b.type === 'teleport') {
                e.behaviorTimer -= dt
                if (e.behaviorTimer <= 0) {
                    e.x += Math.cos(angToPlayer) * 300
                    e.y += Math.sin(angToPlayer) * 300
                    e.behaviorTimer = 3
                    this.spawnExplosion(e.x, e.y, e.color, 1)
                }
            } else if (b.type === 'snipe') {
                const range = b.range || 500
                if (d < range * 0.9) { e.vx = -Math.cos(angToPlayer) * speed; e.vy = -Math.sin(angToPlayer) * speed }
                else if (d > range * 1.1) { e.vx = Math.cos(angToPlayer) * speed; e.vy = Math.sin(angToPlayer) * speed }
                else { e.vx *= 0.8; e.vy *= 0.8 }
            } else if (b.type === 'heal') {
                const range = b.range || 200
                let targetAlly = this.data.enemies.find(ally => ally !== e && ally.health < ally.maxHealth && dist(e.x, e.y, ally.x, ally.y) < range)
                if (targetAlly) {
                    const angToAlly = angle(e.x, e.y, targetAlly.x, targetAlly.y)
                    e.vx = Math.cos(angToAlly) * speed
                    e.vy = Math.sin(angToAlly) * speed
                    e.fireTimer += dt * 1000
                    if (e.def.fireRate > 0 && e.fireTimer >= e.def.fireRate) {
                        e.fireTimer = 0
                        targetAlly.health = Math.min(targetAlly.maxHealth, targetAlly.health + 40)
                        this.spawnDamageNumber(targetAlly.x, targetAlly.y, -40)
                        this.spawnExplosion(targetAlly.x, targetAlly.y, '#00ff00', 0.5)
                    }
                } else {
                    if (d < 300) { e.vx = -Math.cos(angToPlayer) * speed; e.vy = -Math.sin(angToPlayer) * speed }
                    else { e.vx = (Math.random() - 0.5) * speed; e.vy = (Math.random() - 0.5) * speed }
                }
            }

            // Separation force
            for (const other of this.data.enemies) {
                if (other !== e) {
                    const od = dist(e.x, e.y, other.x, other.y)
                    const minDist = e.def.size + other.def.size + 10
                    if (od < minDist && od > 0) {
                        const pushAng = angle(other.x, other.y, e.x, e.y)
                        e.vx += Math.cos(pushAng) * (minDist - od) * 0.05
                        e.vy += Math.sin(pushAng) * (minDist - od) * 0.05
                    }
                }
            }

            e.x = clamp(e.x + e.vx * dt * 60, e.def.size, this.worldW - e.def.size)
            e.y = clamp(e.y + e.vy * dt * 60, e.def.size, this.worldH - e.def.size)

            // Bombers explode
            if (b.type === 'bomb' && d < p.size + e.def.size + 20) {
                e.health = 0
                this.dealDamageToPlayer(e.def.damage * this.data.mutatorEnemyDmgMult)
                this.spawnExplosion(e.x, e.y, '#ff0000', 3)
                this.data.screenShake = 10
            }

            // Body damage against Player
            if (d < p.size + e.def.size) {
                const bodyDmg = (20 + p.statLevels.bodyDamage * 10) * p.computedEffects.bodyDamageMult
                e.health -= bodyDmg * dt
                this.dealDamageToPlayer(e.def.damage * this.data.mutatorEnemyDmgMult * dt * 0.5)
                if (e.health <= 0) {
                    this.onEnemyKilled(e, p)
                }
            }

            // Shooting
            if (e.def.fireRate > 0 && b.type !== 'heal') {
                e.fireTimer += dt * 1000
                if (e.fireTimer >= e.def.fireRate) {
                    e.fireTimer = 0
                    const bx = e.x + Math.cos(e.angle) * e.def.size
                    const by = e.y + Math.sin(e.angle) * e.def.size
                    this.fireBullet(false, bx, by, e.angle, 8, e.def.damage * this.data.mutatorEnemyDmgMult, e.color, 6)
                }
            }

            // Spawning
            if (b.type === 'spawn' && e.def.spawnTypes) {
                e.fireTimer += dt * 1000
                if (e.fireTimer >= 4000) {
                    e.fireTimer = 0
                    this.spawnEnemyAtAbs(e.def.spawnTypes[0], e.x + 40, e.y)
                }
            }
        })
    }

    dealDamageToPlayer(rawDamage: number, target?: Player) {
        const p = target || this.localPlayer
        if (!p.alive) return
        const eff = p.computedEffects

        // Dodge
        if (eff.dodgeChance > 0 && Math.random() < eff.dodgeChance) {
            this.spawnDamageNumber(p.x, p.y - 30, 0) // miss
            return
        }

        // Armor
        let dmg = Math.max(0, rawDamage - eff.flatArmor)

        // Thorns
        if (eff.thornsPercent > 0) {
            // Simplified: spawn damage particles
        }

        p.health -= dmg
        p.noDamageTimer = 0

        // Only shake screen if this is the local player
        const isLocal = p.id === this.data.localPlayerId
        if (dmg > 5 && isLocal) {
            this.data.screenShake = Math.min(15, dmg * 0.5)
            this.data.screenFlash = 0.2
            this.data.screenFlashColor = '#ff0000'
            sfx.playerHit()
        }

        if (p.health <= 0) {
            p.alive = false
            // Explode on death
            if (eff.explodeOnDeath) {
                this.spawnExplosion(p.x, p.y, '#ff4400', 5)
                this.data.enemies.forEach(e => {
                    if (dist(p.x, p.y, e.x, e.y) < 300) {
                        e.health -= 500
                    }
                })
            }
            // Check if game over (all players dead, or solo mode)
            const anyAlive = this.data.players.some(pl => pl.alive)
            if (!anyAlive || this.data.gameMode === 'solo_endless' || this.data.gameMode === 'solo_waves') {
                if (this.data.score > this.data.highScore) {
                    this.data.highScore = this.data.score
                    if (typeof window !== 'undefined') localStorage.setItem('botArenaHighScore', Math.floor(this.data.score).toString())
                }
                this.data.state = 'gameover'
            }
        }
    }

    onEnemyKilled(e: Enemy, killer?: Player) {
        const p = killer || this.localPlayer
        const eff = p.computedEffects

        // Spawn XP orbs instead of direct XP gain
        const orbCount = e.def.boss ? rndInt(8, 15) : rndInt(3, 6)
        const xpPerOrb = Math.floor(e.def.points / orbCount)
        for (let i = 0; i < orbCount; i++) {
            const ang = Math.random() * Math.PI * 2
            const spd = rnd(2, 5)
            this.data.xpOrbs.push({
                x: e.x + rnd(-e.def.size, e.def.size),
                y: e.y + rnd(-e.def.size, e.def.size),
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                value: xpPerOrb,
                size: e.def.boss ? 8 : 5,
                magnetTimer: 0.3 + Math.random() * 0.3,
                alpha: 1,
                color: '#00ffdd',
            })
        }

        this.data.score += Math.floor(e.def.points * this.data.scoreMultiplier)
        this.data.totalKills++
        sfx.kill()

        // Enhanced death explosion with shockwave
        this.spawnExplosion(e.x, e.y, e.color, e.def.boss ? 3 : 1)

        // Power-up drops
        if (Math.random() < 0.08 || (e.def.boss && Math.random() < 0.5)) {
            this.data.powerUps.push({
                x: e.x, y: e.y,
                type: Math.random() < 0.7 ? 'health' : 'damage',
                size: 12, bobPhase: 0, glowIntensity: 1,
                value: Math.random() < 0.7 ? 0.15 : 10,
            })
        }

        if (e.def.boss) {
            this.data.bossActive = false
            // Hit-stop on boss kill
            this.data.slowTimer = Math.max(this.data.slowTimer, 0.4)
            this.data.screenShake = 15
            this.data.screenFlash = 0.5
            this.data.screenFlashColor = '#ffffff'
        }

        // Kill streak
        p.killStreak++
        p.killStreakTimer = 3
        if (p.killStreak > this.data.longestKillStreak) {
            this.data.longestKillStreak = p.killStreak
        }

        // Heal on kill
        if (eff.healOnKill > 0) {
            p.health = Math.min(p.maxHealth, p.health + eff.healOnKill)
        }

        // Lifesteal
        if (eff.lifestealPercent > 0) {
            p.health = Math.min(p.maxHealth, p.health + e.def.health * eff.lifestealPercent)
        }

        // Zap on kill
        if (eff.zapOnKill > 0) {
            let zapped = 0
            this.data.enemies.forEach(other => {
                if (other !== e && zapped < 3 && dist(e.x, e.y, other.x, other.y) < 200) {
                    other.health -= eff.zapOnKill
                    this.spawnDamageNumber(other.x, other.y, eff.zapOnKill)
                    // Visual arc
                    this.data.particles.push({
                        x: e.x, y: e.y, vx: (other.x - e.x) * 0.1, vy: (other.y - e.y) * 0.1,
                        life: 0.2, maxLife: 0.2, size: 3, color: '#88aaff', type: 'spark', alpha: 1
                    })
                    zapped++
                    if (other.health <= 0) {
                        this.data.score += Math.floor(other.def.points * this.data.scoreMultiplier)
                        this.spawnExplosion(other.x, other.y, other.color, 1)
                    }
                }
            })
        }

        // Time warp on kill
        if (eff.timeWarpOnKill) {
            this.data.slowTimer = Math.max(this.data.slowTimer, 0.3)
        }
    }

    updateBullets(dt: number) {
        const p = this.localPlayer
        const eff = p.computedEffects

        this.data.bullets = this.data.bullets.filter(b => {
            b.x += b.vx * dt * 60
            b.y += b.vy * dt * 60
            b.lifetime -= dt
            b.age += dt
            if (b.lifetime <= 0) return false

            // Trail
            b.trail.push({ x: b.x, y: b.y })
            if (b.trail.length > 8) b.trail.shift()

            // Growing bullets
            if (b.growRate > 0) {
                b.size = b.baseSize * (1 + b.age * b.growRate)
            }

            // Homing
            if (b.homingStrength > 0 && b.isPlayer) {
                let closest: Enemy | null = null
                let closeDist = 300
                this.data.enemies.forEach(e => {
                    const d = dist(b.x, b.y, e.x, e.y)
                    if (d < closeDist && !b.hitEnemies.includes(e.id)) {
                        closeDist = d
                        closest = e
                    }
                })
                if (closest) {
                    const targetAngle = angle(b.x, b.y, (closest as Enemy).x, (closest as Enemy).y)
                    const currentAngle = Math.atan2(b.vy, b.vx)
                    let diff = targetAngle - currentAngle
                    while (diff > Math.PI) diff -= Math.PI * 2
                    while (diff < -Math.PI) diff += Math.PI * 2
                    const newAngle = currentAngle + diff * b.homingStrength
                    const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
                    b.vx = Math.cos(newAngle) * spd
                    b.vy = Math.sin(newAngle) * spd
                }
            }

            // Wall bouncing
            if (b.bounces > 0) {
                if (b.x < 0 || b.x > this.worldW) { b.vx *= -1; b.bounces--; b.x = clamp(b.x, 0, this.worldW) }
                if (b.y < 0 || b.y > this.worldH) { b.vy *= -1; b.bounces--; b.y = clamp(b.y, 0, this.worldH) }
            } else {
                if (b.x < -50 || b.x > this.worldW + 50 || b.y < -50 || b.y > this.worldH + 50) return false
            }

            if (b.isPlayer) {
                for (const e of this.data.enemies) {
                    if (!b.hitEnemies.includes(e.id) && dist(b.x, b.y, e.x, e.y) < b.size + e.def.size) {
                        // Frozen enemies take 2x damage
                        let dmg = b.damage
                        if (e.freezeTimer > 0) dmg *= 2

                        e.health -= dmg
                        e.hitFlashTimer = 0.1
                        this.data.totalDamage += dmg
                        this.data.totalDamageDealt += dmg
                        this.data.dpsTracker.push({ damage: dmg, time: this.data.gameTime })
                        this.spawnDamageNumber(e.x, e.y, dmg)
                        sfx.hit(false)
                        b.hits++
                        b.hitEnemies.push(e.id)

                        // Poison
                        if (b.poisonDamage > 0) {
                            e.poisonTimer = b.poisonDuration
                            e.poisonDamage = b.poisonDamage
                        }

                        // Freeze
                        if (b.freezeChance > 0 && Math.random() < b.freezeChance) {
                            e.freezeTimer = b.freezeDuration
                            this.spawnExplosion(e.x, e.y, '#88ddff', 0.5)
                        }

                        // Explosive
                        if (b.explosive && eff.explosiveRadius > 0) {
                            this.data.enemies.forEach(other => {
                                if (other !== e && dist(b.x, b.y, other.x, other.y) < eff.explosiveRadius) {
                                    other.health -= dmg * 0.5
                                    this.spawnDamageNumber(other.x, other.y, dmg * 0.5)
                                }
                            })
                            this.spawnExplosion(b.x, b.y, '#ff8800', eff.explosiveRadius / 40)
                        }

                        // Chain
                        if (b.chains > 0) {
                            let chained = 0
                            this.data.enemies.forEach(other => {
                                if (other !== e && chained < b.chains && dist(e.x, e.y, other.x, other.y) < 200 && !b.hitEnemies.includes(other.id)) {
                                    other.health -= dmg * 0.6
                                    this.spawnDamageNumber(other.x, other.y, dmg * 0.6)
                                    b.hitEnemies.push(other.id)
                                    chained++
                                    // Arc particle
                                    this.data.particles.push({
                                        x: e.x, y: e.y, vx: (other.x - e.x) * 0.05, vy: (other.y - e.y) * 0.05,
                                        life: 0.15, maxLife: 0.15, size: 2, color: '#aaccff', type: 'spark', alpha: 1
                                    })
                                }
                            })
                        }

                        // Split
                        if (eff.bulletsSplit > 0 && b.hits === 1) {
                            for (let s = 0; s < eff.bulletsSplit; s++) {
                                const splitAngle = Math.random() * Math.PI * 2
                                this.firePlayerBullet(b.x, b.y, splitAngle, Math.sqrt(b.vx * b.vx + b.vy * b.vy) * 0.7, dmg * 0.4, b.color, b.size * 0.6, 1, false)
                            }
                        }

                        // Vampiric
                        if (eff.vampiricBullets) {
                            p.health = Math.min(p.maxHealth, p.health + dmg * 0.01)
                        }

                        if (e.health <= 0) {
                            const bulletOwner = this.data.players.find(pl => pl.id === b.ownerId)
                            this.onEnemyKilled(e, bulletOwner)
                        }

                        // Impact particles
                        this.spawnExplosion(b.x, b.y, b.color, 0.3)

                        if (b.hits >= b.maxHits && !b.piercing) return false
                    }
                }
            } else {
                // Enemy bullet — check against ALL alive players
                for (const pl of this.alivePlayers) {
                    if (dist(b.x, b.y, pl.x, pl.y) < b.size + pl.size) {
                        this.dealDamageToPlayer(b.damage, pl)
                        return false
                    }
                }
            }

            // FFA PvP: player bullets can hit OTHER players
            if (b.isPlayer && this.data.gameMode === 'ffa') {
                for (const pl of this.alivePlayers) {
                    if (pl.id !== b.ownerId && dist(b.x, b.y, pl.x, pl.y) < b.size + pl.size) {
                        this.dealDamageToPlayer(b.damage * 0.8, pl) // slightly reduced PvP damage
                        this.spawnExplosion(b.x, b.y, b.color, 0.3)
                        if (!pl.alive) {
                            // Award score to killer
                            this.data.score += 500
                        }
                        return false
                    }
                }
            }

            return true
        })
        this.data.enemies = this.data.enemies.filter(e => e.health > 0)
    }

    updateSpecialMutations(dt: number) {
        const p = this.localPlayer
        const eff = p.computedEffects

        // Orbital bullets
        if (eff.orbitalBullets > 0) {
            p.orbitalAngle += dt * 3 * eff.orbitalSpeed
            // Damage enemies near orbitals
            for (let i = 0; i < eff.orbitalBullets; i++) {
                const orbAngle = p.orbitalAngle + (i / eff.orbitalBullets) * Math.PI * 2
                const orbX = p.x + Math.cos(orbAngle) * (p.size + 50)
                const orbY = p.y + Math.sin(orbAngle) * (p.size + 50)
                this.data.enemies.forEach(e => {
                    if (dist(orbX, orbY, e.x, e.y) < 20 + e.def.size) {
                        e.health -= eff.orbitalDamage * dt
                        if (e.health <= 0) this.onEnemyKilled(e)
                    }
                })
            }
        }

        // Fire trail
        if (eff.fireTrail) {
            p.fireTrailTimer += dt
            if (p.fireTrailTimer >= 0.1 && (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5)) {
                p.fireTrailTimer = 0
                this.data.particles.push({
                    x: p.x, y: p.y, vx: rnd(-0.5, 0.5), vy: rnd(-0.5, 0.5),
                    life: 1.5, maxLife: 1.5, size: 12,
                    color: '#ff6600', type: 'fire', alpha: 1
                })
                // Damage enemies in fire
                this.data.enemies.forEach(e => {
                    if (dist(p.x, p.y, e.x, e.y) < 30) {
                        e.health -= 10 * dt
                    }
                })
            }
        }

        // Aura of decay
        if (eff.auraOfDecay) {
            p.auraTimer += dt
            this.data.enemies.forEach(e => {
                if (dist(p.x, p.y, e.x, e.y) < eff.auraRadius) {
                    e.health -= eff.auraDamage * dt
                    if (e.health <= 0) this.onEnemyKilled(e)
                }
            })
            if (p.auraTimer >= 0.3) {
                p.auraTimer = 0
                this.data.particles.push({
                    x: p.x + rnd(-eff.auraRadius, eff.auraRadius),
                    y: p.y + rnd(-eff.auraRadius, eff.auraRadius),
                    vx: 0, vy: -1, life: 0.5, maxLife: 0.5, size: 5,
                    color: '#88ff00', type: 'aura', alpha: 0.5
                })
            }
        }

        // Magnetic field
        if (eff.magneticField) {
            this.data.enemies.forEach(e => {
                const d = dist(p.x, p.y, e.x, e.y)
                if (d < 200 && d > p.size + e.def.size) {
                    const ang = angle(e.x, e.y, p.x, p.y)
                    e.vx += Math.cos(ang) * 2
                    e.vy += Math.sin(ang) * 2
                }
                if (d < 80) {
                    e.health -= eff.magneticDamage * dt
                    if (e.health <= 0) this.onEnemyKilled(e)
                }
            })
        }

        // Meteor shower
        if (eff.meteorShower) {
            p.meteorTimer += dt
            if (p.meteorTimer >= 2) {
                p.meteorTimer = 0
                // Drop a meteor on a random enemy
                const target = this.data.enemies[Math.floor(Math.random() * this.data.enemies.length)]
                if (target) {
                    this.spawnExplosion(target.x, target.y, '#ff4400', 2)
                    target.health -= 50
                    this.spawnDamageNumber(target.x, target.y, 50)
                    this.data.enemies.forEach(other => {
                        if (other !== target && dist(target.x, target.y, other.x, other.y) < 100) {
                            other.health -= 25
                        }
                    })
                    if (target.health <= 0) this.onEnemyKilled(target)
                    this.data.screenShake = 5
                }
            }
        }
    }

    updateParticles(dt: number) {
        this.data.particles = this.data.particles.filter(p => {
            p.x += p.vx * dt * 60
            p.y += p.vy * dt * 60
            p.vx *= 0.95
            p.vy *= 0.95
            p.life -= dt
            p.alpha = p.life / p.maxLife
            return p.life > 0
        })
    }
    updateDamageNumbers(dt: number) {
        this.data.damageNumbers = this.data.damageNumbers.filter(d => {
            d.y += d.vy * dt * 60
            d.life -= dt
            return d.life > 0
        })
    }
    updatePowerUps(dt: number) {
        this.data.powerUps = this.data.powerUps.filter(pu => {
            pu.bobPhase += dt * 3
            pu.glowIntensity = 0.5 + Math.sin(pu.bobPhase) * 0.5

            // Find nearest alive player for magnetizing
            const p = this.nearestPlayer(pu.x, pu.y)
            if (!p) return true
            const d = dist(p.x, p.y, pu.x, pu.y)
            // Magnetize when close
            if (d < 150) {
                const a = angle(pu.x, pu.y, p.x, p.y)
                pu.x += Math.cos(a) * 5 * dt * 60
                pu.y += Math.sin(a) * 5 * dt * 60
            }
            if (d < p.size + pu.size) {
                sfx.powerUp()
                if (pu.type === 'health') {
                    const heal = p.maxHealth * pu.value
                    p.health = Math.min(p.maxHealth, p.health + heal)
                    this.data.totalHealingDone += heal
                    this.spawnDamageNumber(p.x, p.y, -Math.floor(heal))
                } else if (pu.type === 'damage') {
                    p.damageBoost = Math.max(p.damageBoost, 10)
                }
                // Sparkle
                for (let i = 0; i < 8; i++) {
                    const ang = (i / 8) * Math.PI * 2
                    this.data.particles.push({
                        x: pu.x, y: pu.y, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3,
                        life: 0.4, maxLife: 0.4, size: 4, color: pu.type === 'health' ? '#00ff88' : '#ffaa00',
                        type: 'spark', alpha: 1
                    })
                }
                return false
            }
            return true
        })
    }

    updateXpOrbs(dt: number) {
        this.data.xpOrbs = this.data.xpOrbs.filter(orb => {
            orb.magnetTimer -= dt

            // Find nearest alive player
            const p = this.nearestPlayer(orb.x, orb.y)
            if (!p) return true
            const eff = p.computedEffects
            const pickupRange = 150 * eff.pickupRangeMult

            if (orb.magnetTimer <= 0) {
                // Magnetize toward player
                const d = dist(orb.x, orb.y, p.x, p.y)
                if (d < pickupRange) {
                    const a = angle(orb.x, orb.y, p.x, p.y)
                    const speed = 8 + (pickupRange - d) * 0.05
                    orb.vx = Math.cos(a) * speed
                    orb.vy = Math.sin(a) * speed
                } else {
                    orb.vx *= 0.92
                    orb.vy *= 0.92
                }
            } else {
                // Scatter phase — slow down
                orb.vx *= 0.9
                orb.vy *= 0.9
            }

            orb.x += orb.vx * dt * 60
            orb.y += orb.vy * dt * 60

            // Collect — give XP to the player who actually picked it up
            if (dist(orb.x, orb.y, p.x, p.y) < p.size + orb.size) {
                this.gainXp(orb.value, p)
                if (p.id === this.data.localPlayerId) sfx.xpPickup()
                return false
            }

            // Fade after 15s
            orb.alpha -= dt * 0.05
            return orb.alpha > 0
        })
    }

    /** Client-side interpolation: extrapolate entity positions between snapshots for smooth 60fps rendering */
    interpolateEntities(dt: number) {
        // Extrapolate player positions using velocity
        this.data.players.forEach(p => {
            if (!p.alive) return
            p.x += p.vx * dt * 60
            p.y += p.vy * dt * 60
        })
        // Extrapolate enemy positions
        this.data.enemies.forEach(e => {
            e.x += e.vx * dt * 60
            e.y += e.vy * dt * 60
            if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt
            if (e.spawnAnimTimer > 0) e.spawnAnimTimer -= dt
        })
        // Extrapolate bullet positions
        this.data.bullets.forEach(b => {
            b.x += b.vx * dt * 60
            b.y += b.vy * dt * 60
            b.lifetime -= dt
            b.trail.push({ x: b.x, y: b.y })
            if (b.trail.length > 8) b.trail.shift()
        })
        // Remove expired bullets
        this.data.bullets = this.data.bullets.filter(b => b.lifetime > 0)
        // Extrapolate XP orbs
        this.data.xpOrbs.forEach(orb => {
            orb.x += orb.vx * dt * 60
            orb.y += orb.vy * dt * 60
        })
    }

    spawnExplosion(x: number, y: number, color: string, size: number) {
        // Particle burst
        for (let i = 0; i < 20 * size; i++) {
            const ang = Math.random() * Math.PI * 2
            const spd = rnd(2, 6 * size)
            this.data.particles.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.5, maxLife: 0.5, size: 4 * size, color, type: 'explosion', alpha: 1 })
        }
        // Shockwave ring
        this.data.particles.push({
            x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4,
            size: 10 * size, color, type: 'ring', alpha: 1
        })
    }

    spawnDamageNumber(x: number, y: number, val: number) {
        const color = val <= 0 ? '#00ff00' : '#fff'
        this.data.damageNumbers.push({ x: x + rnd(-10, 10), y, value: Math.floor(Math.abs(val)), vy: -2, life: 1, color, scale: val > 50 ? 1.5 : 1 })
    }

    getWorldDimensions() {
        return { width: this.worldW, height: this.worldH }
    }
}
