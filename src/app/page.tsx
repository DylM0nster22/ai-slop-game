'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { GameEngine } from '@/lib/engine'
import { CANVAS_WIDTH, CANVAS_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/utils'
import { CLASS_TREE } from '@/lib/classes'
import { ALL_MUTATORS, rarityColor, rarityBgColor, pickMutationDraft } from '@/lib/mutations'
import { MutatorDef, MutationDef } from '@/lib/types'
import { initAudio, sfx } from '@/lib/sounds'
import { MultiplayerClient } from '@/lib/network'
import type { RoomInfo, GameMode } from '@/lib/multiplayer-types'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    w = Math.max(0, w); h = Math.max(0, h);
    if (w < 2 * r) r = w / 2; if (h < 2 * r) r = h / 2
    r = Math.max(0, r);
    ctx.beginPath(); ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function drawShape(ctx: CanvasRenderingContext2D, shape: string, s: number) {
    s = Math.max(0, s);
    if (shape === 'circle') { ctx.arc(0, 0, s, 0, Math.PI * 2) }
    else if (shape === 'square') { ctx.rect(-s, -s, s * 2, s * 2) }
    else if (shape === 'triangle') { ctx.moveTo(s, 0); ctx.lineTo(-s, -s); ctx.lineTo(-s, s); ctx.closePath() }
    else if (shape === 'octagon') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const m = i === 0 ? 'moveTo' : 'lineTo'; ctx[m](Math.cos(a) * s, Math.sin(a) * s) }; ctx.closePath() }
    else if (shape === 'star') { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const r = i % 2 === 0 ? s : s * 0.5; const m = i === 0 ? 'moveTo' : 'lineTo'; ctx[m](Math.cos(a) * r, Math.sin(a) * r) }; ctx.closePath() }
    else { ctx.arc(0, 0, s, 0, Math.PI * 2) }
}
function adjustColor(hex: string, amount: number): string {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    r = Math.max(0, Math.min(255, r + amount)); g = Math.max(0, Math.min(255, g + amount)); b = Math.max(0, Math.min(255, b + amount))
    return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const engineRef = useRef<GameEngine | null>(null)
    const networkRef = useRef<MultiplayerClient | null>(null)
    const [showStatPanel, setShowStatPanel] = useState(false)
    const [lobbyState, setLobbyState] = useState<{ room: RoomInfo | null; error: string; name: string; roomCode: string; mode: 'ffa' | 'coop'; connecting: boolean; serverUrl: string }>({ room: null, error: '', name: 'Player', roomCode: '', mode: 'coop', connecting: false, serverUrl: 'wss://semirigorous-nonrestrictedly-suzette.ngrok-free.dev' })
    const [uiState, setUiState] = useState({
        state: 'title' as string, skillPoints: 0,
        statLevels: { healthRegen: 0, maxHealth: 0, bodyDamage: 0, bulletSpeed: 0, bulletPenetration: 0, bulletDamage: 0, reload: 0, movementSpeed: 0 },
        mutationDraft: [] as MutationDef[], activeMutators: [] as MutatorDef[],
        mutations: [] as { name: string; icon: string; stacks: number }[],
        score: 0, highScore: 0, level: 0, killStreak: 0, gameTime: 0, totalKills: 0,
        autoFire: false, bossWarningTimer: 0, bossActive: false, peakDps: 0,
        totalDamageDealt: 0, totalHealingDone: 0, longestKillStreak: 0,
        dpsTracker: [] as { damage: number; time: number }[], className: 'Basic', gameMode: 'solo_endless' as string,
        wave: 1, waveTimer: 60, waveActive: true, pendingMutations: 0,
        leaderboard: [] as any[], leaderboardSubmitted: false
    })

    const fetchLeaderboard = useCallback(() => {
        fetch('/api/leaderboard').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setUiState(p => ({ ...p, leaderboard: data }))
        }).catch(e => console.error('Leaderboard fetch error:', e))
    }, [])

    useEffect(() => {
        fetchLeaderboard()
    }, [fetchLeaderboard])

    useEffect(() => {
        if (uiState.state === 'gameover' && uiState.gameMode?.startsWith('solo') && !uiState.leaderboardSubmitted && uiState.score > 0) {
            setUiState(p => ({ ...p, leaderboardSubmitted: true }))
            fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: lobbyStateRef.current.name || 'Player', score: Math.floor(uiState.score), mode: uiState.gameMode })
            }).then(() => fetchLeaderboard()).catch(e => console.error('Leaderboard submit error:', e))
        } else if (uiState.state === 'playing' && uiState.leaderboardSubmitted) {
            setUiState(p => ({ ...p, leaderboardSubmitted: false }))
        }
    }, [uiState.state, uiState.gameMode, uiState.score, uiState.leaderboardSubmitted, fetchLeaderboard])

    useEffect(() => {
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!
        const engine = new GameEngine()
        engineRef.current = engine
        let lastTime = performance.now()
        let animationId = 0

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            engine.mouse.x = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width)
            engine.mouse.y = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height)
        }
        const handleMouseDown = () => { engine.mouse.down = true; engine.mouse.clicked = true }
        const handleMouseUp = () => { engine.mouse.down = false }
        const handleKeyDown = (e: KeyboardEvent) => {
            engine.keys[e.key.toLowerCase()] = true
            if (e.key.toLowerCase() === 'e' && engine.data.state === 'playing') engine.data.autoFire = !engine.data.autoFire
        }
        const handleKeyUp = (e: KeyboardEvent) => { engine.keys[e.key.toLowerCase()] = false }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mouseup', handleMouseUp)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        const renderGame = () => {
            const d = engine.data
            const localP = d.players.find(pl => pl.id === d.localPlayerId) || d.players[0]
            const world = engine.getWorldDimensions()
            ctx.fillStyle = '#060612'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            // Nebula
            const time = d.bgPhase
            const nebs = [
                { x: CANVAS_WIDTH * 0.2, y: CANVAS_HEIGHT * 0.3, r: 300, color: `hsla(${(time * 20) % 360}, 60%, 15%, 0.3)` },
                { x: CANVAS_WIDTH * 0.8, y: CANVAS_HEIGHT * 0.7, r: 350, color: `hsla(${(time * 20 + 120) % 360}, 50%, 12%, 0.25)` },
            ]
            nebs.forEach(n => { const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r); g.addColorStop(0, n.color); g.addColorStop(1, 'transparent'); ctx.fillStyle = g; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT) })
            ctx.save()
            const shakeX = d.screenShake > 0 && d.screenShakeEnabled ? (Math.random() - 0.5) * d.screenShake : 0
            const shakeY = d.screenShake > 0 && d.screenShakeEnabled ? (Math.random() - 0.5) * d.screenShake : 0
            ctx.translate(CANVAS_WIDTH / 2 - d.camera.x + shakeX, CANVAS_HEIGHT / 2 - d.camera.y + shakeY)
            // Grid
            ctx.strokeStyle = 'rgba(100,120,200,0.15)'; ctx.lineWidth = 1; ctx.beginPath()
            for (let x = 0; x <= world.width; x += 100) { ctx.moveTo(x, 0); ctx.lineTo(x, world.height) }
            for (let y = 0; y <= world.height; y += 100) { ctx.moveTo(0, y); ctx.lineTo(world.width, y) }
            ctx.stroke()
            // Bounds
            ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 20; ctx.strokeStyle = '#ff2244'; ctx.lineWidth = 3
            ctx.strokeRect(0, 0, world.width, world.height); ctx.shadowBlur = 0
            // Particles
            d.particles.forEach(pt => { ctx.globalAlpha = pt.alpha; ctx.fillStyle = pt.color; ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1, pt.size * pt.alpha), 0, Math.PI * 2); ctx.fill() })
            ctx.globalAlpha = 1
            // XP Orbs
            d.xpOrbs.forEach(orb => {
                ctx.globalAlpha = orb.alpha; ctx.save(); ctx.translate(orb.x, orb.y); ctx.rotate(d.gameTime * 3)
                ctx.shadowColor = orb.color; ctx.shadowBlur = 8; ctx.fillStyle = orb.color
                const s = orb.size; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.6, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.6, 0); ctx.closePath(); ctx.fill()
                ctx.shadowBlur = 0; ctx.restore()
            })
            ctx.globalAlpha = 1
            // PowerUps
            d.powerUps.forEach(pu => {
                ctx.save(); ctx.translate(pu.x, pu.y + Math.sin(pu.bobPhase) * 4)
                const puColor = pu.type === 'health' ? '#00ff88' : '#ffaa00'
                ctx.shadowColor = puColor; ctx.shadowBlur = 15; ctx.fillStyle = puColor
                ctx.beginPath(); ctx.arc(0, 0, Math.max(0, pu.size), 0, Math.PI * 2); ctx.fill()
                ctx.fillStyle = '#fff'; ctx.font = `bold ${pu.size}px Arial`; ctx.textAlign = 'center'
                ctx.fillText(pu.type === 'health' ? '+' : '⚡', 0, pu.size * 0.35)
                ctx.shadowBlur = 0; ctx.restore()
            })
            // Bullets
            d.bullets.forEach(b => {
                if (b.trail.length > 1) { for (let t = 1; t < b.trail.length; t++) { const r = t / b.trail.length; ctx.globalAlpha = r * 0.4; ctx.strokeStyle = b.color; ctx.lineWidth = b.size * r; ctx.beginPath(); ctx.moveTo(b.trail[t - 1].x, b.trail[t - 1].y); ctx.lineTo(b.trail[t].x, b.trail[t].y); ctx.stroke() } ctx.globalAlpha = 1 }
                ctx.shadowColor = b.color; ctx.shadowBlur = b.size * 2; ctx.fillStyle = b.color
                const bs = Math.max(0, b.size);
                ctx.beginPath(); ctx.arc(b.x, b.y, bs, 0, Math.PI * 2); ctx.fill()
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(0, bs * 0.4), 0, Math.PI * 2); ctx.fill()
                ctx.shadowBlur = 0
            })
            // Enemies
            d.enemies.forEach(e => {
                const spawnScale = e.spawnAnimTimer > 0 ? Math.max(0, 1 - e.spawnAnimTimer / 0.3) : 1
                ctx.save(); ctx.translate(e.x, e.y); ctx.scale(spawnScale, spawnScale); ctx.rotate(e.angle)
                const s = e.def.size; const isFlashing = e.hitFlashTimer > 0
                if (e.def.boss) { ctx.save(); ctx.rotate(-e.angle); ctx.globalAlpha = 0.15; const bg = ctx.createRadialGradient(0, 0, s, 0, 0, s * 2.5); bg.addColorStop(0, e.color + '44'); bg.addColorStop(1, 'transparent'); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, s * 2.5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.restore() }
                if (e.freezeTimer > 0) { ctx.globalAlpha = 0.4; ctx.fillStyle = '#aaddff'; ctx.beginPath(); ctx.arc(0, 0, s + 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 }
                ctx.shadowColor = e.color; ctx.shadowBlur = e.def.boss ? 25 : 12
                if (isFlashing) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 30 }
                ctx.fillStyle = isFlashing ? '#fff' : adjustColor(e.color, -40); ctx.strokeStyle = e.color; ctx.lineWidth = 2
                ctx.beginPath(); drawShape(ctx, e.def.shape, s); ctx.closePath(); ctx.fill(); ctx.stroke()
                ctx.fillStyle = isFlashing ? '#fff' : e.color; ctx.beginPath(); drawShape(ctx, e.def.shape, s * 0.65); ctx.closePath(); ctx.fill()
                ctx.shadowBlur = 0
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2); ctx.fill()
                // HP bar
                ctx.save(); ctx.rotate(-e.angle); const hpPct = Math.max(0, e.health / e.maxHealth)
                if (hpPct < 1) { const bW = s * 1.6, bH = 5, bY = -s - 14; ctx.fillStyle = '#11111188'; roundRect(ctx, -bW / 2, bY, bW, bH, 3); ctx.fill(); ctx.fillStyle = hpPct > 0.5 ? '#00ff88' : hpPct > 0.25 ? '#ffcc00' : '#ff4444'; roundRect(ctx, -bW / 2, bY, bW * hpPct, bH, 2); ctx.fill() }
                ctx.restore(); ctx.restore()
            })
            // ALL Players
            d.players.forEach(pl => {
                if (!pl.alive) return
                const isLocal = pl.id === d.localPlayerId
                const eff = pl.computedEffects

                const drawPlayerModel = (x: number, y: number, angle: number, alpha: number, isShadow: boolean) => {
                    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = alpha
                    ctx.save(); ctx.rotate(angle)
                    pl.classDef.barrels.forEach(barrel => {
                        ctx.save(); ctx.rotate(barrel.angleOffset)
                        ctx.fillStyle = isShadow ? '#222' : '#444'; ctx.strokeStyle = isShadow ? '#111' : '#222'; ctx.lineWidth = 3
                        ctx.fillRect(barrel.xOffset, barrel.yOffset - barrel.width / 2, barrel.length, barrel.width)
                        ctx.strokeRect(barrel.xOffset, barrel.yOffset - barrel.width / 2, barrel.length, barrel.width)
                        ctx.restore()
                    })
                    ctx.restore()
                    ctx.save(); ctx.rotate(angle)
                    const pColor = isShadow ? '#444' : (isLocal ? pl.classDef.color : pl.color)
                    const pls = Math.max(0, pl.size)
                    ctx.shadowColor = pColor; ctx.shadowBlur = isShadow ? 10 : 20; ctx.fillStyle = pColor; ctx.strokeStyle = isShadow ? '#111' : '#222'; ctx.lineWidth = 3
                    ctx.beginPath(); ctx.arc(0, 0, pls, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
                    ctx.shadowBlur = 0; ctx.fillStyle = '#111'
                    ctx.beginPath(); ctx.arc(0, 0, Math.max(0, pls * 0.35), 0, Math.PI * 2); ctx.fill()
                    ctx.restore()
                    ctx.restore()
                }

                if (eff && eff.shadowClones > 0) {
                    for (let c = 1; c <= eff.shadowClones; c++) {
                        const cAngle = pl.angle + (c / (eff.shadowClones + 1)) * Math.PI * 2 + d.gameTime
                        const cx = pl.x + Math.cos(cAngle) * 50
                        const cy = pl.y + Math.sin(cAngle) * 50
                        drawPlayerModel(cx, cy, pl.angle, 0.5, true)
                    }
                }

                drawPlayerModel(pl.x, pl.y, pl.angle, 1, false)

                ctx.save(); ctx.translate(pl.x, pl.y)
                // Name tag for remote players
                if (!isLocal) {
                    ctx.fillStyle = '#ffffffcc'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'
                    ctx.fillText(pl.name, 0, -pl.size - 20)
                }
                // HP bar above player
                const phpPct = Math.max(0, pl.health / pl.maxHealth)
                if (phpPct < 1 || !isLocal) {
                    const bw = pl.size * 2; ctx.fillStyle = '#11111188'; roundRect(ctx, -bw / 2, -pl.size - 12, bw, 5, 2); ctx.fill()
                    ctx.fillStyle = phpPct > 0.5 ? '#00ff88' : phpPct > 0.25 ? '#ffcc00' : '#ff4444'
                    roundRect(ctx, -bw / 2, -pl.size - 12, bw * phpPct, 5, 2); ctx.fill()
                }

                // Orbital Bullets
                if (eff && eff.orbitalBullets > 0) {
                    const orbSize = 8
                    for (let i = 0; i < eff.orbitalBullets; i++) {
                        const orbAngle = (pl.orbitalAngle || 0) + (i / eff.orbitalBullets) * Math.PI * 2
                        const ox = Math.cos(orbAngle) * (pl.size + 50)
                        const oy = Math.sin(orbAngle) * (pl.size + 50)
                        ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 15; ctx.fillStyle = '#00ffff'
                        ctx.beginPath(); ctx.arc(ox, oy, orbSize, 0, Math.PI * 2); ctx.fill()
                        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, orbSize * 0.4, 0, Math.PI * 2); ctx.fill()
                        ctx.shadowBlur = 0
                    }
                }

                // Shield Orbs
                if (eff && eff.shieldOrbs > 0) {
                    const orbSize = 10
                    for (let i = 0; i < eff.shieldOrbs; i++) {
                        const orbAngle = -(pl.orbitalAngle || 0) * 0.5 + (i / eff.shieldOrbs) * Math.PI * 2
                        const ox = Math.cos(orbAngle) * (pl.size + 40)
                        const oy = Math.sin(orbAngle) * (pl.size + 40)
                        ctx.shadowColor = '#0088ff'; ctx.shadowBlur = 15; ctx.fillStyle = '#0088ff'
                        ctx.beginPath(); ctx.arc(ox, oy, orbSize, 0, Math.PI * 2); ctx.fill()
                        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, orbSize * 0.5, 0, Math.PI * 2); ctx.fill()
                        ctx.shadowBlur = 0
                    }
                }

                ctx.restore()
            })
            // Damage Numbers
            d.damageNumbers.forEach(dn => { ctx.globalAlpha = dn.life; ctx.fillStyle = dn.color; ctx.font = `bold ${16 * dn.scale}px Arial`; ctx.textAlign = 'center'; ctx.fillText(dn.value === 0 ? 'MISS' : dn.value.toString(), dn.x, dn.y); ctx.globalAlpha = 1 })
            ctx.restore() // end camera
            // Screen flash
            if (d.screenFlash > 0) { ctx.globalAlpha = d.screenFlash * 0.3; ctx.fillStyle = d.screenFlashColor; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.globalAlpha = 1 }

            // === HUD ===
            const hp = Math.max(0, localP.health / localP.maxHealth), hpW = 220
            ctx.fillStyle = '#111111cc'; roundRect(ctx, 18, 18, hpW + 4, 24, 6); ctx.fill()
            ctx.fillStyle = hp > 0.5 ? '#00ff88' : hp > 0.25 ? '#ffcc00' : '#ff4444'
            roundRect(ctx, 20, 20, hpW * hp, 20, 5); ctx.fill()
            ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'
            ctx.fillText(`${Math.floor(localP.health)} / ${Math.floor(localP.maxHealth)}`, 20 + hpW / 2, 35)
            // XP bar
            const xpReq = Math.floor(50 * Math.pow(1.12, localP.level - 1) + localP.level * 30), xpW = 400
            ctx.fillStyle = '#111111cc'; roundRect(ctx, CANVAS_WIDTH / 2 - xpW / 2 - 2, CANVAS_HEIGHT - 32, xpW + 4, 18, 5); ctx.fill()
            ctx.fillStyle = '#00ffffaa'; roundRect(ctx, CANVAS_WIDTH / 2 - xpW / 2, CANVAS_HEIGHT - 30, xpW * (localP.xp / xpReq), 14, 4); ctx.fill()
            ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'
            ctx.fillText(`LVL ${localP.level} — ${localP.classDef.name.toUpperCase()}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 38)
            // Score & time
            ctx.textAlign = 'right'; ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#fff'
            ctx.fillText(`SCORE: ${Math.floor(d.score)}`, CANVAS_WIDTH - 20, 35)
            const mins = Math.floor(d.gameTime / 60), secs = Math.floor(d.gameTime % 60)
            ctx.font = '13px Arial'; ctx.fillStyle = '#aaa'
            ctx.fillText(`${mins}:${secs.toString().padStart(2, '0')}  |  ${d.totalKills} kills`, CANVAS_WIDTH - 20, 55)
            // Kill streak
            if (localP.killStreak >= 3) { ctx.textAlign = 'center'; ctx.font = `bold ${20 + Math.min(localP.killStreak, 10)}px Arial`; ctx.fillStyle = `hsl(${localP.killStreak * 15}, 100%, 60%)`; ctx.fillText(`${localP.killStreak} KILL STREAK!`, CANVAS_WIDTH / 2, 80) }
            // Boss HP
            const activeBoss = d.enemies.find(e => e.def.boss)
            if (activeBoss) { const bhp = Math.max(0, activeBoss.health / activeBoss.maxHealth), bbw = CANVAS_WIDTH - 100; ctx.fillStyle = '#11111199'; roundRect(ctx, 50, 5, bbw, 14, 5); ctx.fill(); ctx.fillStyle = '#ff00ff'; roundRect(ctx, 50, 5, bbw * bhp, 14, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.fillText(`BOSS — ${Math.max(0, Math.floor(activeBoss.health))}`, CANVAS_WIDTH / 2, 16) }
            // Boss Warning
            if (d.bossWarningTimer > 0 && !d.bossActive) { ctx.textAlign = 'center'; ctx.font = 'bold 28px Arial'; ctx.fillStyle = `rgba(255,0,100,${0.5 + Math.sin(d.gameTime * 10) * 0.5})`; ctx.fillText('⚠ BOSS INCOMING ⚠', CANVAS_WIDTH / 2, 130) }
            // Wave info
            if (d.gameMode !== 'solo_endless') {
                ctx.textAlign = 'center'; ctx.font = 'bold 24px Arial'; ctx.fillStyle = '#fff'
                ctx.fillText(`WAVE ${d.wave}`, CANVAS_WIDTH / 2, 35)
                ctx.font = '20px Arial'; ctx.fillStyle = d.waveTimer < 10 ? '#ff4444' : '#aaaaaa'
                ctx.fillText(`${Math.ceil(d.waveTimer)}s`, CANVAS_WIDTH / 2, 60)
            }
            // Game mode indicator
            if (d.isMultiplayer) { ctx.textAlign = 'left'; ctx.font = 'bold 11px Arial'; ctx.fillStyle = d.gameMode === 'ffa' ? '#ff4488' : '#44ff88'; ctx.fillText(d.gameMode === 'ffa' ? 'FFA PVP' : 'CO-OP', 22, CANVAS_HEIGHT - 50) }
            // Auto fire
            if (d.autoFire) { ctx.textAlign = 'left'; ctx.font = 'bold 12px Arial'; ctx.fillStyle = '#00ff88'; ctx.fillText('AUTO', 22, CANVAS_HEIGHT - 65) }
            // Minimap
            const mmW = 120, mmH = 120, mmX = CANVAS_WIDTH - mmW - 15, mmY = 90
            ctx.fillStyle = '#0a0a2288'; roundRect(ctx, mmX, mmY, mmW, mmH, 6); ctx.fill()
            ctx.strokeStyle = '#334466'; ctx.lineWidth = 1; roundRect(ctx, mmX, mmY, mmW, mmH, 6); ctx.stroke()
            d.players.forEach(pl => { if (!pl.alive) return; const px = mmX + (pl.x / world.width) * mmW, py = mmY + (pl.y / world.height) * mmH; ctx.fillStyle = pl.id === d.localPlayerId ? pl.classDef.color : pl.color; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill() })
            d.enemies.forEach(e => { const ex = mmX + (e.x / world.width) * mmW, ey = mmY + (e.y / world.height) * mmH; if (ex >= mmX && ex <= mmX + mmW && ey >= mmY && ey <= mmY + mmH) { ctx.fillStyle = e.def.boss ? '#ff00ff' : '#ff4444'; ctx.beginPath(); ctx.arc(ex, ey, e.def.boss ? 3 : 1.5, 0, Math.PI * 2); ctx.fill() } })
            // Mutation icons
            if (localP.mutations.length > 0) { const ms = 28, sp = 32, sx = CANVAS_WIDTH - 20, sy = CANVAS_HEIGHT - 60; localP.mutations.forEach((m, i) => { const col = i % 10, row = Math.floor(i / 10); const mx = sx - col * sp, my = sy - row * sp; ctx.fillStyle = rarityBgColor(m.def.rarity) + 'cc'; roundRect(ctx, mx - ms / 2, my - ms / 2, ms, ms, 4); ctx.fill(); ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(m.def.icon, mx, my + 6); if (m.stacks > 1) { ctx.font = 'bold 10px Arial'; ctx.fillStyle = '#ffcc00'; ctx.fillText(`x${m.stacks}`, mx + 12, my + 14) } }) }
        }

        const renderClassSelect = () => {
            const d = engine.data, p = engine.localPlayer; ctx.fillStyle = 'rgba(6,6,18,0.85)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            ctx.textAlign = 'center'; ctx.fillStyle = '#00ffff'; ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 15; ctx.font = 'bold 48px Arial'; ctx.fillText('EVOLUTION', CANVAS_WIDTH / 2, 80); ctx.shadowBlur = 0
            ctx.fillStyle = '#aaddff'; ctx.font = '16px Arial'; ctx.fillText('Choose your next form', CANVAS_WIDTH / 2, 110)
            const options = p.classDef.upgradesTo.map(id => CLASS_TREE[id]).filter(Boolean)
            if (options.length === 0) { ctx.fillStyle = '#888'; ctx.font = '24px Arial'; ctx.fillText('MAX EVOLUTION REACHED', CANVAS_WIDTH / 2, 300); if (engine.mouse.clicked) engine.data.state = 'playing'; return }
            const boxW = 220, totalW = options.length * boxW + (options.length - 1) * 30; let startX = CANVAS_WIDTH / 2 - totalW / 2 + boxW / 2
            options.forEach((opt, i) => {
                const x = startX + i * (boxW + 30), y = 300
                const hover = engine.mouse.x > x - boxW / 2 && engine.mouse.x < x + boxW / 2 && engine.mouse.y > y - 150 && engine.mouse.y < y + 150
                ctx.fillStyle = hover ? '#1a1a3a' : '#111128'; ctx.strokeStyle = opt.color; ctx.lineWidth = hover ? 3 : 2
                if (hover) { ctx.shadowColor = opt.color; ctx.shadowBlur = 20 }
                roundRect(ctx, x - boxW / 2, y - 150, boxW, 300, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0
                ctx.fillStyle = opt.color; ctx.font = 'bold 20px Arial'; ctx.fillText(opt.name, x, y - 80)
                ctx.fillStyle = '#aaa'; ctx.font = '12px Arial'; ctx.fillText(opt.desc, x, y - 55)
                // Draw preview
                ctx.save(); ctx.translate(x, y + 20); ctx.fillStyle = opt.color; ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill()
                opt.barrels.forEach(b => { ctx.save(); ctx.rotate(b.angleOffset); ctx.fillStyle = '#555'; ctx.fillRect(b.xOffset, b.yOffset - b.width / 2, b.length, b.width); ctx.restore() })
                ctx.restore()
                if (hover && engine.mouse.clicked) {
                    engine.upgradeClass(opt.id)
                    if (engine.data.isMultiplayer && !engine.data.isHost) {
                        networkRef.current?.sendAction('upgrade_class', opt.id)
                    }
                }
            })
        }

        const renderMutationDraft = () => {
            const d = engine.data; ctx.fillStyle = 'rgba(6,6,18,0.85)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            ctx.textAlign = 'center'; ctx.fillStyle = '#ff88ff'; ctx.shadowColor = '#ff88ff'; ctx.shadowBlur = 15; ctx.font = 'bold 40px Arial'; ctx.fillText('MUTATION', CANVAS_WIDTH / 2, 80); ctx.shadowBlur = 0
            ctx.fillStyle = '#cc88cc'; ctx.font = '14px Arial'; ctx.fillText('Choose a mutation', CANVAS_WIDTH / 2, 105)
            const draft = d.mutationDraft; if (draft.length === 0) return
            const boxW = 200, totalW = draft.length * boxW + (draft.length - 1) * 20; let startX = CANVAS_WIDTH / 2 - totalW / 2 + boxW / 2
            draft.forEach((mut, i) => {
                const x = startX + i * (boxW + 20), y = 340
                const hover = engine.mouse.x > x - boxW / 2 && engine.mouse.x < x + boxW / 2 && engine.mouse.y > y - 200 && engine.mouse.y < y + 200
                const rc = rarityColor(mut.rarity), rbc = rarityBgColor(mut.rarity)
                ctx.fillStyle = hover ? rbc + 'dd' : rbc + '88'; ctx.strokeStyle = rc; ctx.lineWidth = hover ? 3 : 2
                if (hover) { ctx.shadowColor = rc; ctx.shadowBlur = 15 }
                roundRect(ctx, x - boxW / 2, y - 200, boxW, 400, 12); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0
                ctx.font = '36px Arial'; ctx.fillText(mut.icon, x, y - 120)
                ctx.fillStyle = rc; ctx.font = 'bold 16px Arial'; ctx.fillText(mut.name, x, y - 70)
                ctx.fillStyle = '#888'; ctx.font = '10px Arial'; ctx.fillText(mut.rarity.toUpperCase(), x, y - 50)
                ctx.fillStyle = '#ccc'; ctx.font = '12px Arial'
                const words = mut.desc.split(' '); let line = '', lineY = y - 25
                words.forEach(w => { const test = line + w + ' '; if (ctx.measureText(test).width > boxW - 30) { ctx.fillText(line, x, lineY); lineY += 16; line = w + ' ' } else { line = test } })
                ctx.fillText(line, x, lineY)
                if (hover && engine.mouse.clicked) {
                    engine.addMutation(mut)
                    if (engine.data.isMultiplayer && !engine.data.isHost) {
                        networkRef.current?.sendAction('add_mutation', mut)
                    }
                }
            })
        }

        const renderGameOver = () => {
            const d = engine.data, p = engine.localPlayer
            ctx.fillStyle = 'rgba(6,6,18,0.85)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.textAlign = 'center'
            ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20; ctx.font = 'bold 60px Arial'; ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 80); ctx.shadowBlur = 0
            ctx.fillStyle = '#fff'; ctx.font = 'bold 36px Arial'; ctx.fillText(`${Math.floor(d.score)}`, CANVAS_WIDTH / 2, 130)
            ctx.fillStyle = '#888'; ctx.font = '14px Arial'; ctx.fillText('FINAL SCORE', CANVAS_WIDTH / 2, 148)
            const mins = Math.floor(d.gameTime / 60), secs = Math.floor(d.gameTime % 60)
            const stats = [
                { label: 'TIME', value: `${mins}:${secs.toString().padStart(2, '0')}`, color: '#ffaa44' },
                { label: 'KILLS', value: `${d.totalKills}`, color: '#ff6666' },
                { label: 'LEVEL', value: `${p.level}`, color: '#00ffff' },
                { label: 'CLASS', value: p.classDef.name.toUpperCase(), color: p.classDef.color },
                { label: 'PEAK DPS', value: `${Math.floor(d.peakDps)}`, color: '#ffcc00' },
                { label: 'STREAK', value: `${d.longestKillStreak}`, color: '#ff88ff' },
            ]
            const colW = 180, cols = 3, sx = CANVAS_WIDTH / 2 - (colW * cols) / 2 + colW / 2
            stats.forEach((s, i) => { const col = i % cols, row = Math.floor(i / cols), x = sx + col * colW, y = 180 + row * 80; ctx.fillStyle = '#111128cc'; roundRect(ctx, x - 75, y, 150, 60, 8); ctx.fill(); ctx.fillStyle = s.color; ctx.font = 'bold 22px Arial'; ctx.fillText(s.value, x, y + 28); ctx.fillStyle = '#666'; ctx.font = '10px Arial'; ctx.fillText(s.label, x, y + 48) })
            // All player scores in multiplayer
            if (d.isMultiplayer) { ctx.fillStyle = '#aaa'; ctx.font = '14px Arial'; d.players.forEach((pl, i) => { ctx.fillStyle = pl.color; ctx.fillText(`${pl.name}: LVL ${pl.level}${pl.alive ? '' : ' (DEAD)'}`, CANVAS_WIDTH / 2, 380 + i * 20) }) }
            ctx.fillStyle = '#44aaff'; ctx.font = 'bold 20px Arial'; ctx.fillText('Click to return to Title', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80)
            if (engine.mouse.clicked) { engine.data.state = 'title' }
        }

        const renderShop = () => {
            const d = engine.data, p = engine.localPlayer
            ctx.fillStyle = 'rgba(6,6,18,0.9)'; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); ctx.textAlign = 'center'
            ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 15; ctx.font = 'bold 48px Arial'; ctx.fillText('WAVE CLEARED', CANVAS_WIDTH / 2, 80); ctx.shadowBlur = 0

            // Check pending mutations / evolutions
            if (p.pendingMutations > 0) {
                ctx.fillStyle = '#fff'; ctx.font = '24px Arial'; ctx.fillText(`You have ${p.pendingMutations} pending mutation drafts!`, CANVAS_WIDTH / 2, 140)

                // Draw a button to start drafting
                ctx.fillStyle = '#111128'; ctx.strokeStyle = '#4488ff'; ctx.lineWidth = 2
                const btnX = CANVAS_WIDTH / 2 - 100, btnY = 180, btnW = 200, btnH = 50
                const hover = engine.mouse.x > btnX && engine.mouse.x < btnX + btnW && engine.mouse.y > btnY && engine.mouse.y < btnY + btnH
                if (hover) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#66aaff' }
                roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke()
                ctx.fillStyle = '#4488ff'; ctx.font = 'bold 20px Arial'; ctx.fillText('DRAFT MUTATION', CANVAS_WIDTH / 2, 212)

                if (hover && engine.mouse.clicked) {
                    p.pendingMutations--
                    // Since it's wave mode, all accumulated levels use the player's current level for rarity weights.
                    engine.data.mutationDraft = pickMutationDraft(p.mutations, 3, p.level)
                    if (engine.data.mutationDraft.length > 0) {
                        engine.data.state = 'mutation_draft'
                    }
                }
            } else if ([15, 30, 45, 60].includes(p.level) && p.classDef.upgradesTo.length > 0) {
                // If we also hit a class milestone, offer class select
                engine.data.state = 'class_select'
            } else {
                ctx.fillStyle = '#888'; ctx.font = '20px Arial'; ctx.fillText('Spend your skill points or wait for the next wave.', CANVAS_WIDTH / 2, 140)
                ctx.fillStyle = '#fff'; ctx.font = '16px Arial'; ctx.fillText(`Press START when ready.`, CANVAS_WIDTH / 2, 180)

                // Draw Title Button (and Restart Button on Multiplier)
                ctx.fillStyle = '#111128'; ctx.strokeStyle = '#ff4488'; ctx.lineWidth = 2
                const d = engine.data

                if (d.isMultiplayer && !d.isHost) {
                    ctx.fillStyle = '#888'; ctx.font = '20px Arial'; ctx.fillText('WAITING FOR HOST...', CANVAS_WIDTH / 2, 450)

                    // Allow non-hosts to leave just in case
                    const btnX = CANVAS_WIDTH / 2 - 100, btnY = 500, btnW = 200, btnH = 50
                    const hover = engine.mouse.x > btnX && engine.mouse.x < btnX + btnW && engine.mouse.y > btnY && engine.mouse.y < btnY + btnH
                    if (hover) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#ff88aa' }
                    roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke()
                    ctx.fillStyle = '#ff4488'; ctx.font = 'bold 20px Arial'; ctx.fillText('LEAVE LOBBY', CANVAS_WIDTH / 2, 532)
                    if (hover && engine.mouse.clicked) {
                        engine.data.state = 'title'
                        // Disconnect WS client when returning to title
                        if (networkRef.current) {
                            networkRef.current.disconnect()
                            networkRef.current = null
                        }
                        setLobbyState(prev => ({ ...prev, room: null }))
                    }
                } else {
                    if (d.isMultiplayer && d.isHost) {
                        // Next Wave Button for Host
                        const btnX_nw = CANVAS_WIDTH / 2 - 100, btnY_nw = 390, btnW_nw = 200, btnH_nw = 50
                        const hover_nw = engine.mouse.x > btnX_nw && engine.mouse.x < btnX_nw + btnW_nw && engine.mouse.y > btnY_nw && engine.mouse.y < btnY_nw + btnH_nw
                        if (hover_nw) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#66ffaa' } else { ctx.fillStyle = '#111128'; ctx.strokeStyle = '#00cc66' }
                        ctx.beginPath(); roundRect(ctx, btnX_nw, btnY_nw, btnW_nw, btnH_nw, 8); ctx.fill(); ctx.stroke()
                        ctx.fillStyle = hover_nw ? '#66ffaa' : '#00cc66'; ctx.font = 'bold 20px Arial'; ctx.fillText('NEXT WAVE', CANVAS_WIDTH / 2, 422)
                        if (hover_nw && engine.mouse.clicked) {
                            engine.startNextWave()
                        }

                        const btnX = CANVAS_WIDTH / 2 - 100, btnY = 460, btnW = 200, btnH = 50
                        const hover = engine.mouse.x > btnX && engine.mouse.x < btnX + btnW && engine.mouse.y > btnY && engine.mouse.y < btnY + btnH
                        if (hover) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#4488ff' } else { ctx.strokeStyle = '#2255aa' }
                        ctx.beginPath(); roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke()
                        ctx.fillStyle = hover ? '#66aaff' : '#4488ff'; ctx.font = 'bold 20px Arial'; ctx.fillText('RESTART GAME', CANVAS_WIDTH / 2, 492)
                        if (hover && engine.mouse.clicked) {
                            engine.startGame(engine.data.gameMode as any)
                        }

                        // Title Button for Multiplayer Host
                        const btnX2 = CANVAS_WIDTH / 2 - 100, btnW2 = 200, btnH2 = 50
                        const hover2 = engine.mouse.x > btnX2 && engine.mouse.x < btnX2 + btnW2 && engine.mouse.y > 530 && engine.mouse.y < 530 + btnH2
                        if (hover2) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#ff88aa' } else { ctx.fillStyle = '#111128'; ctx.strokeStyle = '#ff4488' }
                        ctx.beginPath(); roundRect(ctx, btnX2, 530, btnW2, btnH2, 8); ctx.fill(); ctx.stroke()
                        ctx.fillStyle = '#ff4488'; ctx.font = 'bold 20px Arial'; ctx.fillText('RETURN TO TITLE', CANVAS_WIDTH / 2, 530 + 32)

                        if (hover2 && engine.mouse.clicked) {
                            engine.data.state = 'title'
                            if (networkRef.current) {
                                networkRef.current.disconnect()
                                networkRef.current = null
                            }
                            setLobbyState(prev => ({ ...prev, room: null }))
                        }
                    } else if (d.gameMode === 'solo_waves' && !d.isMultiplayer) {
                        // Next Wave Button for Solo Waves
                        const btnX = CANVAS_WIDTH / 2 - 100, btnY = 390, btnW = 200, btnH = 50
                        const hover = engine.mouse.x > btnX && engine.mouse.x < btnX + btnW && engine.mouse.y > btnY && engine.mouse.y < btnY + btnH
                        if (hover) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#66ffaa' } else { ctx.fillStyle = '#111128'; ctx.strokeStyle = '#00cc66' }
                        ctx.beginPath(); roundRect(ctx, btnX, btnY, btnW, btnH, 8); ctx.fill(); ctx.stroke()
                        ctx.fillStyle = hover ? '#66ffaa' : '#00cc66'; ctx.font = 'bold 20px Arial'; ctx.fillText('NEXT WAVE', CANVAS_WIDTH / 2, 422)
                        if (hover && engine.mouse.clicked) {
                            engine.startNextWave()
                        }

                        // Title Button for Solo
                        const btnX2 = CANVAS_WIDTH / 2 - 100, btnW2 = 200, btnH2 = 50
                        const hover2 = engine.mouse.x > btnX2 && engine.mouse.x < btnX2 + btnW2 && engine.mouse.y > 460 && engine.mouse.y < 460 + btnH2
                        if (hover2) { ctx.fillStyle = '#1a1a3a'; ctx.strokeStyle = '#ff88aa' } else { ctx.fillStyle = '#111128'; ctx.strokeStyle = '#ff4488' }
                        ctx.beginPath(); roundRect(ctx, btnX2, 460, btnW2, btnH2, 8); ctx.fill(); ctx.stroke()
                        ctx.fillStyle = '#ff4488'; ctx.font = 'bold 20px Arial'; ctx.fillText('RETURN TO TITLE', CANVAS_WIDTH / 2, 460 + 32)

                        if (hover2 && engine.mouse.clicked) {
                            engine.data.state = 'title'
                        }
                    }
                }
            }
        }

        let lastSnapshotSend = 0
        const SNAPSHOT_INTERVAL = 16 // ms (~60fps snapshots)

        const loop = (currentTime: number) => {
            const dt = Math.min((currentTime - lastTime) / 1000, 0.1); lastTime = currentTime
            const d = engine.data
            const net = networkRef.current
            const isMP = d.isMultiplayer
            const isHost = d.isHost

            // Multiplayer input sending (client sends to host)
            if (isMP && net?.connected && d.state === 'playing') {
                // Calculate angle from mouse position relative to camera
                const lp = engine.localPlayer
                if (lp) {
                    const screenPx = lp.x - d.camera.x + CANVAS_WIDTH / 2
                    const screenPy = lp.y - d.camera.y + CANVAS_HEIGHT / 2
                    const ang = Math.atan2(engine.mouse.y - screenPy, engine.mouse.x - screenPx)
                    lp.angle = ang // update local angle for rendering
                    net.sendInput(engine.keys, engine.mouse.x, engine.mouse.y, engine.mouse.down || d.autoFire, ang, d.autoFire)
                }
            }

            // Game tick: only host (or solo) runs the engine
            if (d.state === 'playing') {
                if (!isMP || isHost) {
                    // Host: apply remote inputs, tick, then send snapshot
                    engine.tick(dt)
                    if (isMP && net?.connected && currentTime - lastSnapshotSend > SNAPSHOT_INTERVAL) {
                        lastSnapshotSend = currentTime
                        net.sendSnapshot(engine.createSnapshot())
                    }
                } else {
                    // Client (non-host): interpolate entity positions for smooth rendering
                    engine.interpolateEntities(dt)
                    engine.updateCamera()
                    engine.updateParticles(dt)
                    engine.updateDamageNumbers(dt)
                }
            } else if (d.state === 'class_select' || d.state === 'mutation_draft') {
                engine.updateParticles(dt)
            }

            if (d.state === 'title' || d.state === 'playing') renderGame()
            else if (d.state === 'class_select') { renderGame(); renderClassSelect() }
            else if (d.state === 'mutation_draft') { renderGame(); renderMutationDraft() }
            else if (d.state === 'gameover') { renderGame(); renderGameOver() }
            else if (d.state === 'shop') { renderGame(); renderShop() }
            else if (d.state === 'lobby') { renderGame() }
            engine.mouse.clicked = false
            setUiState(prev => {
                const lp = engine.localPlayer; const stateChanged = prev.state !== engine.data.state; const pointsChanged = prev.skillPoints !== lp.skillPoints
                if (stateChanged || pointsChanged || prev.autoFire !== engine.data.autoFire || prev.bossActive !== engine.data.bossActive || prev.pendingMutations !== lp.pendingMutations) {
                    return { ...prev, state: engine.data.state, skillPoints: lp.skillPoints, statLevels: { ...lp.statLevels }, mutationDraft: [...engine.data.mutationDraft], activeMutators: [...engine.data.activeMutators], mutations: lp.mutations.map(m => ({ name: m.def.name, icon: m.def.icon, stacks: m.stacks })), score: engine.data.score, highScore: engine.data.highScore, level: lp.level, killStreak: lp.killStreak, gameTime: engine.data.gameTime, totalKills: engine.data.totalKills, autoFire: engine.data.autoFire, bossWarningTimer: engine.data.bossWarningTimer, bossActive: engine.data.bossActive, peakDps: engine.data.peakDps, totalDamageDealt: engine.data.totalDamageDealt, totalHealingDone: engine.data.totalHealingDone, longestKillStreak: engine.data.longestKillStreak, dpsTracker: engine.data.dpsTracker, className: lp.classDef.name, gameMode: engine.data.gameMode, wave: engine.data.wave, waveTimer: engine.data.waveTimer, waveActive: engine.data.waveActive, pendingMutations: lp.pendingMutations }
                }
                return prev
            })
            animationId = requestAnimationFrame(loop)
        }
        animationId = requestAnimationFrame(loop)
        return () => { cancelAnimationFrame(animationId); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
    }, [])

    const lobbyStateRef = useRef(lobbyState)
    lobbyStateRef.current = lobbyState

    const connectMultiplayer = useCallback(async () => {
        if (networkRef.current?.connected) return
        const engine = engineRef.current!
        setLobbyState(prev => ({ ...prev, connecting: true, error: '' }))
        try {
            const client = new MultiplayerClient({
                onRoomCreated: (room, playerId) => { engine.data.localPlayerId = playerId; engine.data.isMultiplayer = true; engine.data.isHost = true; engine.data.roomId = room.id; setLobbyState(prev => ({ ...prev, room, connecting: false })) },
                onRoomJoined: (room, playerId) => { engine.data.localPlayerId = playerId; engine.data.isMultiplayer = true; engine.data.isHost = false; engine.data.roomId = room.id; setLobbyState(prev => ({ ...prev, room, connecting: false })) },
                onRoomUpdated: (room) => { setLobbyState(prev => ({ ...prev, room })) },
                onPlayerJoined: (player) => { engine.addPlayer(player.id, player.name, player.color) },
                onPlayerLeft: (playerId) => { engine.removePlayer(playerId) },
                onGameStarting: (room) => {
                    engine.data.gameMode = room.mode as any
                    if (engine.data.isHost) {
                        engine.startGame(room.mode as any)
                    } else {
                        // Client: initialize audio and go straight to playing
                        // The host will send snapshots that drive all game state
                        initAudio()
                        engine.data.state = 'playing'
                        engine.data.gameMode = room.mode as any
                        engine.data.isMultiplayer = true
                    }
                },
                onRemoteInput: (input) => { engine.applyRemoteInput(input) },
                onSnapshot: (snapshot) => { if (!engine.data.isHost) engine.applySnapshot(snapshot) },
                onError: (msg) => { setLobbyState(prev => ({ ...prev, error: msg, connecting: false })) },
                onDisconnect: () => { setLobbyState(prev => ({ ...prev, room: null, connecting: false })) },
            })
            // Append /socket so the Ngrok proxy routes it to port 3001
            let wsUrl = lobbyStateRef.current.serverUrl.replace(/\/$/, '')
            if (!wsUrl.endsWith('/socket') && !wsUrl.includes('localhost')) {
                wsUrl += '/socket'
            }
            await client.connect(wsUrl)
            networkRef.current = client
            engine.data.state = 'lobby'
            setLobbyState(prev => ({ ...prev, connecting: false }))
        } catch { setLobbyState(prev => ({ ...prev, error: 'Cannot connect to server. Run: npm run server', connecting: false })) }
    }, [])

    return (
        <main className="flex min-h-screen items-center justify-center bg-black">
            <div className="relative">
                <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="border-2 border-slate-800/50 rounded-xl shadow-[0_0_60px_rgba(0,100,255,0.15)]" onContextMenu={(e) => e.preventDefault()} />

                {/* TITLE SCREEN */}
                {uiState.state === 'title' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-50">
                        <h1 className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_20px_rgba(0,255,255,0.6)] mb-2 tracking-tight">BOT ARENA</h1>
                        <p className="text-cyan-400/80 tracking-[0.4em] font-semibold mb-4 uppercase text-lg">Evolution</p>
                        {uiState.highScore > 0 && <p className="text-yellow-400/60 text-sm mb-6">High Score: {Math.floor(uiState.highScore)}</p>}

                        <div className="flex gap-6 mb-8 mt-4 items-stretch">
                            <div className="flex flex-col gap-2 items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
                                <h3 className="text-cyan-400 font-bold mb-2">SINGLE PLAYER</h3>
                                <div className="flex w-full mb-2">
                                    <input type="text" value={lobbyState.name} onChange={e => setLobbyState({ ...lobbyState, name: e.target.value })} placeholder="Player Name" className="w-full bg-black/50 border border-slate-700 rounded-lg px-4 py-2 text-white text-center focus:outline-none focus:border-cyan-500" maxLength={15} />
                                </div>
                                <button onClick={() => engineRef.current?.startGame('solo_endless')} className="w-full px-8 py-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/50 text-cyan-400 font-bold rounded-xl hover:bg-gradient-to-r hover:from-cyan-400 hover:to-blue-500 hover:text-black hover:shadow-[0_0_30px_#00ffff88] transition-all duration-300">ENDLESS</button>
                                <button onClick={() => engineRef.current?.startGame('solo_waves')} className="w-full px-8 py-3 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-400/50 text-teal-400 font-bold rounded-xl hover:bg-gradient-to-r hover:from-teal-400 hover:to-emerald-500 hover:text-black hover:shadow-[0_0_30px_#44ffaa88] transition-all duration-300">WAVES</button>
                            </div>

                            <div className="flex flex-col gap-4 items-center bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md justify-center w-[340px]">
                                <h3 className="text-purple-400 font-bold">ONLINE MULTIPLAYER</h3>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <span className="text-slate-400 text-sm font-bold text-center">Server URL</span>
                                    <input value={lobbyState.serverUrl} onChange={e => {
                                        let url = e.target.value
                                        if (url.startsWith('https://')) url = url.replace('https://', 'wss://')
                                        if (url.startsWith('http://')) url = url.replace('http://', 'ws://')
                                        setLobbyState(prev => ({ ...prev, serverUrl: url }))
                                    }} placeholder="ws://localhost:3001" className="px-4 py-3 bg-black/50 border border-slate-700 rounded-xl text-white text-center font-mono w-full focus:outline-none focus:border-purple-500" />
                                    <p className="text-slate-500 text-[10px] text-center leading-tight mt-1">
                                        If using localtunnel, you must visit the URL in your browser first to bypass the warning.
                                    </p>
                                </div>
                                <button onClick={connectMultiplayer} disabled={lobbyState.connecting} className="px-8 py-4 w-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-400/60 text-purple-400 text-xl font-bold rounded-xl hover:bg-gradient-to-r hover:from-purple-400 hover:to-pink-500 hover:text-black hover:shadow-[0_0_40px_#aa44ff88] transition-all duration-300 transform hover:scale-105 disabled:opacity-50 mt-4">{lobbyState.connecting ? 'CONNECTING...' : 'CONNECT TO SERVER'}</button>
                            </div>
                        </div>

                        {uiState.leaderboard && uiState.leaderboard.length > 0 && (
                            <div className="mt-2 bg-slate-900/80 border border-slate-700/50 p-6 rounded-2xl w-full max-w-2xl max-h-[250px] overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-slate-700">
                                <h3 className="text-yellow-400 font-bold mb-4 text-center tracking-widest text-lg">GLOBAL LEADERBOARD</h3>
                                <div className="space-y-2">
                                    {uiState.leaderboard.slice(0, 50).map((entry, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-black/40 px-4 py-2 rounded-lg border border-slate-800">
                                            <div className="flex items-center gap-4">
                                                <span className={`font-bold w-6 text-right ${idx === 0 ? 'text-yellow-400 text-lg' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>#{idx + 1}</span>
                                                <span className="text-white font-semibold">{entry.name}</span>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="text-slate-400 text-xs">{entry.mode.replace('solo_', '').toUpperCase()}</span>
                                                <span className="text-cyan-400 font-mono font-bold text-lg">{entry.score.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {lobbyState.error && <p className="text-red-400 text-sm">{lobbyState.error}</p>}
                        <p className="text-slate-500 text-xs mt-4">WASD to move • Mouse to aim • Click to shoot • E for auto-fire</p>
                    </div>
                )}

                {/* LOBBY SCREEN */}
                {uiState.state === 'lobby' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-50">
                        {!lobbyState.room ? (
                            <div className="flex flex-col items-center gap-4">
                                <h2 className="text-4xl font-bold text-purple-400 mb-2">SERVER LOBBY</h2>
                                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg mb-2 border border-slate-700">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-green-400 text-sm font-bold">Connected to Server</span>
                                </div>

                                <input value={lobbyState.name} onChange={e => setLobbyState(prev => ({ ...prev, name: e.target.value }))} placeholder="Your name" maxLength={16} className="px-4 py-2 bg-black/50 border border-slate-600 rounded-lg text-white text-center w-48 focus:outline-none focus:border-purple-500 mb-2" />

                                <div className="flex gap-3 mb-2">
                                    <button onClick={() => setLobbyState(prev => ({ ...prev, mode: 'coop' }))} className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${lobbyState.mode === 'coop' ? 'border-green-400 bg-green-400/20 text-green-400' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>🤝 CO-OP</button>
                                    <button onClick={() => setLobbyState(prev => ({ ...prev, mode: 'ffa' }))} className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${lobbyState.mode === 'ffa' ? 'border-red-400 bg-red-400/20 text-red-400' : 'border-slate-600 text-slate-400 hover:border-slate-400'}`}>🎯 FFA PVP</button>
                                </div>
                                <button onClick={() => networkRef.current?.createRoom(lobbyState.name || 'Host', lobbyState.mode)} className="px-10 py-3 border-2 border-green-400 text-green-400 font-bold rounded-xl hover:bg-green-400 hover:text-black transition-all text-lg">CREATE ROOM</button>
                                <div className="flex items-center gap-2 mt-4">
                                    <input value={lobbyState.roomCode} onChange={e => setLobbyState(prev => ({ ...prev, roomCode: e.target.value.toUpperCase() }))} placeholder="ROOM CODE" maxLength={5} className="px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-center w-32 uppercase tracking-widest" />
                                    <button onClick={() => networkRef.current?.joinRoom(lobbyState.roomCode, lobbyState.name || 'Player')} className="px-6 py-2 border-2 border-blue-400 text-blue-400 font-bold rounded-lg hover:bg-blue-400 hover:text-black transition-all">JOIN</button>
                                </div>
                                <button onClick={() => { networkRef.current?.disconnect(); engineRef.current!.data.state = 'title'; engineRef.current!.data.isMultiplayer = false }} className="text-slate-500 hover:text-white mt-4 text-sm">← Back to Title</button>
                                {lobbyState.error && <p className="text-red-400 text-sm mt-2">{lobbyState.error}</p>}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <h2 className="text-3xl font-bold text-purple-400">ROOM {lobbyState.room.id}</h2>
                                <p className="text-sm text-slate-400">{lobbyState.room.mode === 'ffa' ? '🎯 Free-For-All PvP' : '🤝 Team Co-op'} • {lobbyState.room.players.length}/{lobbyState.room.maxPlayers} players</p>
                                <div className="flex flex-col gap-2 w-80 my-4">
                                    {lobbyState.room.players.map(p => (
                                        <div key={p.id} className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 rounded-lg border border-slate-700">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }} />
                                            <span className="text-white font-bold flex-1">{p.name}</span>
                                            {p.isHost && <span className="text-yellow-400 text-xs font-bold">HOST</span>}
                                            <span className={`text-xs font-bold ${p.ready ? 'text-green-400' : 'text-slate-500'}`}>{p.ready ? 'READY' : 'NOT READY'}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-3">
                                    {networkRef.current?.isHost ? (
                                        <button onClick={() => networkRef.current?.startGame()} className="px-10 py-3 border-2 border-green-400 text-green-400 font-bold rounded-xl hover:bg-green-400 hover:text-black transition-all text-lg">START GAME</button>
                                    ) : (
                                        <button onClick={() => networkRef.current?.toggleReady()} className="px-10 py-3 border-2 border-cyan-400 text-cyan-400 font-bold rounded-xl hover:bg-cyan-400 hover:text-black transition-all">TOGGLE READY</button>
                                    )}
                                    <button onClick={() => { networkRef.current?.leaveRoom(); setLobbyState(prev => ({ ...prev, room: null })) }} className="px-6 py-3 border-2 border-red-400/50 text-red-400 font-bold rounded-xl hover:bg-red-400 hover:text-black transition-all">LEAVE</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* MUTATOR SELECT SCREEN */}
                {uiState.state === 'mutator_select' && (
                    <div className="absolute inset-0 flex flex-col items-center bg-black/80 backdrop-blur-sm z-50 overflow-y-auto py-6">
                        <h2 className="text-4xl font-bold text-orange-400 mb-1">MUTATORS</h2>
                        <p className="text-orange-300/60 text-sm mb-4">Toggle modifiers for risk & reward</p>
                        <div className="grid grid-cols-3 gap-3 max-w-[800px] px-4 mb-4">
                            {ALL_MUTATORS.map(mut => {
                                const isActive = uiState.activeMutators.some(m => m.id === mut.id)
                                return (<button key={mut.id} onClick={() => { engineRef.current?.toggleMutator(mut); setUiState(prev => ({ ...prev, activeMutators: [...(engineRef.current?.data.activeMutators || [])] })) }} className={`p-3 rounded-xl border-2 transition-all text-left ${isActive ? 'border-orange-400 bg-orange-400/15' : 'border-slate-700 bg-slate-900/80 hover:border-slate-500'}`}>
                                    <div className="flex items-center gap-2 mb-1"><span className="text-xl">{mut.icon}</span><span className={`font-bold text-sm ${isActive ? 'text-orange-300' : 'text-slate-300'}`}>{mut.name}</span></div>
                                    <p className="text-xs text-slate-400 leading-tight">{mut.desc}</p>
                                    <p className={`text-xs mt-1 font-bold ${mut.scoreMultiplier >= 1 ? 'text-yellow-400' : 'text-blue-400'}`}>{mut.scoreMultiplier >= 1 ? `+${Math.round((mut.scoreMultiplier - 1) * 100)}%` : `${Math.round((mut.scoreMultiplier - 1) * 100)}%`} Score</p>
                                </button>)
                            })}
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-yellow-400 font-bold">Score Multiplier: x{uiState.activeMutators.reduce((a, m) => a * m.scoreMultiplier, 1).toFixed(1)}</span>
                            <button onClick={() => engineRef.current?.startGameAfterMutators()} className="px-12 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 text-green-400 text-xl font-bold rounded-xl hover:bg-green-400 hover:text-black transition-all transform hover:scale-105">START →</button>
                        </div>
                    </div>
                )}

                {/* SKILL POINTS UI */}
                {uiState.state === 'playing' && (
                    <div className="absolute bottom-4 left-4 z-40">
                        <button onClick={() => setShowStatPanel(prev => !prev)} className={`mb-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${uiState.skillPoints > 0 ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-400 animate-pulse' : 'bg-black/50 border-slate-700/50 text-slate-400'}`}>
                            {showStatPanel || uiState.skillPoints > 0 ? '▼' : '▶'} Stats{uiState.skillPoints > 0 ? ` (${uiState.skillPoints} pts)` : ''}
                        </button>
                        {(showStatPanel || uiState.skillPoints > 0) && (
                            <div className="flex flex-col gap-[3px] w-72 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-slate-700/50">
                                {uiState.skillPoints > 0 && <div className="text-cyan-400 font-bold mb-1 ml-1 animate-pulse text-sm">x{uiState.skillPoints} Skill Points</div>}
                                {[{ id: 'healthRegen', label: 'Health Regen', color: 'bg-orange-500' }, { id: 'maxHealth', label: 'Max Health', color: 'bg-pink-500' }, { id: 'bodyDamage', label: 'Body Damage', color: 'bg-indigo-500' }, { id: 'bulletSpeed', label: 'Bullet Speed', color: 'bg-blue-500' }, { id: 'bulletPenetration', label: 'Bullet Pen.', color: 'bg-yellow-500' }, { id: 'bulletDamage', label: 'Bullet Damage', color: 'bg-red-500' }, { id: 'reload', label: 'Reload', color: 'bg-green-500' }, { id: 'movementSpeed', label: 'Move Speed', color: 'bg-cyan-500' }].map(stat => (
                                    <div key={stat.id} className="flex items-center gap-2">
                                        <button disabled={uiState.skillPoints === 0 || (uiState.statLevels as any)[stat.id] >= 12} onClick={() => {
                                            engineRef.current?.upgradeStat(stat.id as any)
                                            if (engineRef.current?.data.isMultiplayer && !engineRef.current?.data.isHost) {
                                                networkRef.current?.sendAction('upgrade_stat', stat.id)
                                            }
                                        }} className="w-7 h-7 flex items-center justify-center bg-slate-800/80 text-white font-bold rounded text-lg disabled:opacity-30 enabled:hover:bg-slate-600 border border-slate-600">+</button>
                                        <div className="flex-1 bg-slate-900/80 h-6 rounded overflow-hidden relative border border-slate-800">
                                            <div className={`h-full ${stat.color} transition-all`} style={{ width: `${((uiState.statLevels as any)[stat.id] / 12) * 100}%` }} />
                                            <span className="absolute inset-0 flex items-center px-3 text-[11px] font-bold text-white uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,1)] z-10">{stat.label}</span>
                                            <span className="absolute inset-y-0 right-0 flex items-center px-3 text-[11px] font-bold text-white/50 z-10">{(uiState.statLevels as any)[stat.id]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    )
}
