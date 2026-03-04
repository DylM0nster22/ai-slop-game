/**
 * Bot Arena Multiplayer Client
 * 
 * Manages WebSocket connection to the multiplayer server.
 * Used by the game to send/receive multiplayer messages.
 */

import type {
    ClientMessage, ServerMessage, RoomInfo, RoomPlayer,
    PlayerInput, GameSnapshot, GameMode
} from './multiplayer-types'

export type NetworkEventCallback = {
    onRoomCreated?: (room: RoomInfo, playerId: string) => void
    onRoomJoined?: (room: RoomInfo, playerId: string) => void
    onRoomUpdated?: (room: RoomInfo) => void
    onRoomList?: (rooms: RoomInfo[]) => void
    onPlayerJoined?: (player: RoomPlayer) => void
    onPlayerLeft?: (playerId: string) => void
    onGameStarting?: (room: RoomInfo) => void
    onRemoteInput?: (input: PlayerInput) => void
    onSnapshot?: (snapshot: GameSnapshot) => void
    onChat?: (playerId: string, name: string, message: string) => void
    onError?: (message: string) => void
    onDisconnect?: () => void
    onConnect?: () => void
}

export class MultiplayerClient {
    private ws: WebSocket | null = null
    private callbacks: NetworkEventCallback = {}
    private inputSeq = 0
    private lastInputSend = 0
    private readonly INPUT_SEND_RATE = 50 // ms between input sends (20fps)
    private reconnectAttempts = 0
    private maxReconnects = 3
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null
    private pendingActions: { type: string; payload: any }[] = []

    public connected = false
    public playerId: string | null = null
    public currentRoom: RoomInfo | null = null

    constructor(callbacks: NetworkEventCallback) {
        this.callbacks = callbacks
    }

    connect(url: string = 'ws://localhost:3001'): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url)

                this.ws.onopen = () => {
                    this.connected = true
                    this.reconnectAttempts = 0
                    this.callbacks.onConnect?.()
                    // Start heartbeat to prevent server timeout
                    this.heartbeatInterval = setInterval(() => {
                        if (this.ws?.readyState === WebSocket.OPEN) {
                            this.ws.send(JSON.stringify({ type: 'heartbeat' }))
                        }
                    }, 10000)
                    resolve()
                }

                this.ws.onmessage = (event) => {
                    try {
                        const msg: ServerMessage = JSON.parse(event.data as string)
                        this.handleMessage(msg)
                    } catch (e) {
                        console.error('[Network] Failed to parse message:', e)
                    }
                }

                this.ws.onclose = () => {
                    this.connected = false
                    this.currentRoom = null
                    this.playerId = null
                    this.callbacks.onDisconnect?.()
                }

                this.ws.onerror = (err) => {
                    console.error('[Network] WebSocket error:', err)
                    if (!this.connected) reject(new Error('Connection failed'))
                }
            } catch (e) {
                reject(e)
            }
        })
    }

    disconnect() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
        if (this.ws) {
            this.ws.close()
            this.ws = null
        }
        this.connected = false
        this.currentRoom = null
        this.playerId = null
    }

    private send(msg: ClientMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg))
        }
    }

    private handleMessage(msg: ServerMessage) {
        switch (msg.type) {
            case 'room_created':
                this.currentRoom = msg.room
                this.playerId = msg.playerId
                this.callbacks.onRoomCreated?.(msg.room, msg.playerId)
                break
            case 'room_joined':
                this.currentRoom = msg.room
                this.playerId = msg.playerId
                this.callbacks.onRoomJoined?.(msg.room, msg.playerId)
                break
            case 'room_updated':
                this.currentRoom = msg.room
                this.callbacks.onRoomUpdated?.(msg.room)
                break
            case 'room_list':
                this.callbacks.onRoomList?.(msg.rooms)
                break
            case 'player_joined':
                this.callbacks.onPlayerJoined?.(msg.player)
                break
            case 'player_left':
                this.callbacks.onPlayerLeft?.(msg.playerId)
                break
            case 'game_starting':
                this.currentRoom = msg.room
                this.callbacks.onGameStarting?.(msg.room)
                break
            case 'input':
                this.callbacks.onRemoteInput?.(msg.input)
                break
            case 'snapshot':
                this.callbacks.onSnapshot?.(msg.snapshot)
                break
            case 'chat':
                this.callbacks.onChat?.(msg.playerId, msg.name, msg.message)
                break
            case 'error':
                this.callbacks.onError?.(msg.message)
                break
        }
    }

    // ======= PUBLIC API =======

    createRoom(name: string, mode: GameMode) {
        this.send({ type: 'create_room', name, mode })
    }

    joinRoom(roomId: string, name: string) {
        this.send({ type: 'join_room', roomId: roomId.toUpperCase(), name })
    }

    leaveRoom() {
        this.send({ type: 'leave_room' })
        this.currentRoom = null
    }

    toggleReady() {
        this.send({ type: 'player_ready' })
    }

    startGame() {
        this.send({ type: 'start_game' })
    }

    listRooms() {
        this.send({ type: 'list_rooms' })
    }

    sendChat(message: string) {
        this.send({ type: 'chat', message })
    }

    /**
     * Send player input to the host. Throttled to INPUT_SEND_RATE.
     */
    sendInput(keys: Record<string, boolean>, mouseX: number, mouseY: number, mouseDown: boolean, angle: number, autoFire: boolean) {
        const now = Date.now()
        if (now - this.lastInputSend < this.INPUT_SEND_RATE && this.pendingActions.length === 0) return
        this.lastInputSend = now

        const input: PlayerInput = {
            playerId: this.playerId || '',
            keys: { ...keys },
            mouseX, mouseY, mouseDown, angle, autoFire,
            seq: this.inputSeq++,
        }

        if (this.pendingActions.length > 0) {
            input.actions = [...this.pendingActions]
            this.pendingActions = []
        }

        this.send({ type: 'input', input })
    }

    /**
     * Queue an action (like a stat upgrade or mutation) to be sent with the next input payload.
     * Triggers an immediate input send if possible.
     */
    sendAction(type: string, payload: any) {
        this.pendingActions.push({ type, payload })
        // Try forcing an immediate send
        this.lastInputSend = 0
    }

    /**
     * Send game snapshot from host to all clients. Throttled to ~20fps.
     */
    sendSnapshot(snapshot: GameSnapshot) {
        this.send({ type: 'snapshot', snapshot })
    }

    get isHost(): boolean {
        if (!this.currentRoom || !this.playerId) return false
        return this.currentRoom.hostId === this.playerId
    }
}
