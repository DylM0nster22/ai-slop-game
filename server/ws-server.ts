/**
 * Bot Arena Multiplayer WebSocket Server
 * 
 * Run with: npx ts-node server/ws-server.ts
 * Or:       npx tsx server/ws-server.ts
 * 
 * Handles room management and message relay between players.
 * The HOST client runs the actual game engine; this server just routes messages.
 */

import { WebSocketServer, WebSocket } from 'ws'

// Inline types to avoid import issues with the client code
type GameMode = 'ffa' | 'coop' | 'solo'

interface RoomPlayer {
    id: string
    name: string
    color: string
    ready: boolean
    isHost: boolean
}

interface RoomInfo {
    id: string
    hostId: string
    mode: GameMode
    players: RoomPlayer[]
    maxPlayers: number
    state: 'lobby' | 'playing' | 'finished'
}

const PLAYER_COLORS = ['#00ccff', '#ff4488', '#44ff88', '#ffaa00']

// ======= STATE =======

interface ConnectedClient {
    ws: WebSocket
    id: string
    name: string
    roomId: string | null
    lastHeartbeat: number
}

const clients = new Map<string, ConnectedClient>()
const rooms = new Map<string, RoomInfo>()

// ======= HELPERS =======

function generateId(length = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
}

function generatePlayerId(): string {
    return 'p_' + Math.random().toString(36).substr(2, 9)
}

function send(ws: WebSocket, msg: any) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg))
    }
}

function broadcast(roomId: string, msg: any, excludeId?: string) {
    const room = rooms.get(roomId)
    if (!room) return
    room.players.forEach(p => {
        if (p.id !== excludeId) {
            const client = clients.get(p.id)
            if (client) send(client.ws, msg)
        }
    })
}

function getRoomInfo(room: RoomInfo): RoomInfo {
    return {
        id: room.id,
        hostId: room.hostId,
        mode: room.mode,
        players: room.players,
        maxPlayers: room.maxPlayers,
        state: room.state,
    }
}

function removePlayerFromRoom(playerId: string) {
    const client = clients.get(playerId)
    if (!client || !client.roomId) return

    const room = rooms.get(client.roomId)
    if (!room) return

    room.players = room.players.filter(p => p.id !== playerId)
    client.roomId = null

    if (room.players.length === 0) {
        rooms.delete(room.id)
        console.log(`[Room ${room.id}] Deleted (empty)`)
        return
    }

    // If host left, assign new host
    if (room.hostId === playerId) {
        room.hostId = room.players[0].id
        room.players[0].isHost = true
        room.players[0].color = PLAYER_COLORS[0]
        console.log(`[Room ${room.id}] New host: ${room.players[0].name}`)
    }

    broadcast(room.id, { type: 'player_left', playerId })
    broadcast(room.id, { type: 'room_updated', room: getRoomInfo(room) })
}

// ======= SERVER =======

import * as http from 'http'

const PORT = parseInt(process.env.WS_PORT || '3001')

// Create a basic HTTP server that always returns 200 OK.
// This is required for `localtunnel` to successfully test the connection via a web browser.
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Bot Arena Server is Running.</h1><p>You may now return to the game and connect!</p>');
});

const wss = new WebSocketServer({ server })

server.listen(PORT, () => {
    console.log(`🎮 Bot Arena WebSocket Server running on ws://localhost:${PORT}`)
})

wss.on('connection', (ws: WebSocket) => {
    const clientId = generatePlayerId()
    const client: ConnectedClient = {
        ws,
        id: clientId,
        name: 'Player',
        roomId: null,
        lastHeartbeat: Date.now(),
    }
    clients.set(clientId, client)
    console.log(`[Connect] ${clientId}`)

    ws.on('message', (raw: Buffer) => {
        let msg: any
        try {
            msg = JSON.parse(raw.toString())
        } catch {
            return
        }

        client.lastHeartbeat = Date.now()

        switch (msg.type) {
            case 'create_room': {
                if (client.roomId) removePlayerFromRoom(clientId)

                const roomId = generateId(5)
                client.name = msg.name || 'Host'
                const room: RoomInfo = {
                    id: roomId,
                    hostId: clientId,
                    mode: msg.mode || 'coop',
                    players: [{
                        id: clientId,
                        name: client.name,
                        color: PLAYER_COLORS[0],
                        ready: true,
                        isHost: true,
                    }],
                    maxPlayers: 4,
                    state: 'lobby',
                }
                rooms.set(roomId, room)
                client.roomId = roomId

                send(ws, { type: 'room_created', room: getRoomInfo(room), playerId: clientId })
                console.log(`[Room ${roomId}] Created by ${client.name} (${msg.mode})`)
                break
            }

            case 'join_room': {
                if (client.roomId) removePlayerFromRoom(clientId)

                const room = rooms.get(msg.roomId?.toUpperCase())
                if (!room) {
                    send(ws, { type: 'error', message: 'Room not found' })
                    return
                }
                if (room.players.length >= room.maxPlayers) {
                    send(ws, { type: 'error', message: 'Room is full' })
                    return
                }
                if (room.state !== 'lobby') {
                    send(ws, { type: 'error', message: 'Game already in progress' })
                    return
                }

                client.name = msg.name || 'Player'
                const playerColor = PLAYER_COLORS[room.players.length % PLAYER_COLORS.length]
                const roomPlayer: RoomPlayer = {
                    id: clientId,
                    name: client.name,
                    color: playerColor,
                    ready: false,
                    isHost: false,
                }
                room.players.push(roomPlayer)
                client.roomId = room.id

                send(ws, { type: 'room_joined', room: getRoomInfo(room), playerId: clientId })
                broadcast(room.id, { type: 'player_joined', player: roomPlayer }, clientId)
                broadcast(room.id, { type: 'room_updated', room: getRoomInfo(room) })
                console.log(`[Room ${room.id}] ${client.name} joined (${room.players.length}/${room.maxPlayers})`)
                break
            }

            case 'leave_room': {
                removePlayerFromRoom(clientId)
                break
            }

            case 'player_ready': {
                if (!client.roomId) return
                const room = rooms.get(client.roomId)
                if (!room) return
                const p = room.players.find(p => p.id === clientId)
                if (p) {
                    p.ready = !p.ready
                    broadcast(room.id, { type: 'room_updated', room: getRoomInfo(room) })
                }
                break
            }

            case 'start_game': {
                if (!client.roomId) return
                const room = rooms.get(client.roomId)
                if (!room || room.hostId !== clientId) return
                room.state = 'playing'
                broadcast(room.id, { type: 'game_starting', room: getRoomInfo(room) })
                console.log(`[Room ${room.id}] Game started!`)
                break
            }

            case 'input': {
                // Client sends input to host
                if (!client.roomId) return
                const room = rooms.get(client.roomId)
                if (!room) return
                // Forward input to the host
                const host = clients.get(room.hostId)
                if (host && host.id !== clientId) {
                    send(host.ws, { type: 'input', input: { ...msg.input, playerId: clientId } })
                }
                break
            }

            case 'snapshot': {
                // Host sends snapshot to all clients
                if (!client.roomId) return
                const room = rooms.get(client.roomId)
                if (!room || room.hostId !== clientId) return
                broadcast(room.id, { type: 'snapshot', snapshot: msg.snapshot }, clientId)
                break
            }

            case 'list_rooms': {
                const roomList = Array.from(rooms.values())
                    .filter(r => r.state === 'lobby' && r.players.length < r.maxPlayers)
                    .map(getRoomInfo)
                send(ws, { type: 'room_list', rooms: roomList })
                break
            }

            case 'heartbeat': {
                // lastHeartbeat already updated above the switch
                break
            }

            case 'chat': {
                if (!client.roomId) return
                broadcast(client.roomId, {
                    type: 'chat',
                    playerId: clientId,
                    name: client.name,
                    message: msg.message?.slice(0, 200) || '',
                })
                break
            }
        }
    })

    ws.on('close', () => {
        removePlayerFromRoom(clientId)
        clients.delete(clientId)
        console.log(`[Disconnect] ${clientId}`)
    })

    ws.on('error', () => {
        removePlayerFromRoom(clientId)
        clients.delete(clientId)
    })
})

// Heartbeat: disconnect stale clients
setInterval(() => {
    const now = Date.now()
    clients.forEach((client, id) => {
        if (now - client.lastHeartbeat > 30000) {
            console.log(`[Timeout] ${id}`)
            client.ws.terminate()
            removePlayerFromRoom(id)
            clients.delete(id)
        }
    })
}, 10000)
