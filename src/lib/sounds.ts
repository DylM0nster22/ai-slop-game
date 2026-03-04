let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null

export const initAudio = () => {
    if (typeof window === 'undefined') return
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        masterGain = audioCtx.createGain()
        masterGain.gain.value = 0.3
        masterGain.connect(audioCtx.destination)
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume()
    }
}

export const setMasterVolume = (vol: number) => {
    if (masterGain) masterGain.gain.value = vol
}

const playTone = (freq: number, type: OscillatorType, dur: number, vol: number, slideFreq?: number) => {
    if (!audioCtx || !masterGain) return

    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime)
    if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideFreq), audioCtx.currentTime + dur)
    }

    gain.gain.setValueAtTime(Math.min(vol, 0.3), audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)

    osc.connect(gain)
    gain.connect(masterGain)

    osc.start()
    osc.stop(audioCtx.currentTime + dur)
}

const playNoise = (dur: number, vol: number) => {
    if (!audioCtx || !masterGain) return
    const bufferSize = audioCtx.sampleRate * dur
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * vol
    }
    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    const gain = audioCtx.createGain()
    gain.gain.setValueAtTime(vol, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
    source.connect(gain)
    gain.connect(masterGain)
    source.start()
}

export const sfx = {
    shoot: (pitchMult: number = 1) => {
        playTone(300 * pitchMult, 'square', 0.08, 0.08, 100 * pitchMult)
    },
    hit: (isCrit: boolean = false) => {
        if (isCrit) {
            playTone(800, 'square', 0.1, 0.12, 200)
            playTone(1200, 'sine', 0.15, 0.08)
        } else {
            playNoise(0.06, 0.08)
        }
    },
    kill: () => {
        playTone(150, 'sawtooth', 0.15, 0.1, 50)
        setTimeout(() => playTone(400, 'square', 0.15, 0.08, 800), 40)
    },
    levelUp: () => {
        const t = 80
        playTone(400, 'sine', 0.1, 0.08)
        setTimeout(() => playTone(500, 'sine', 0.1, 0.08), t)
        setTimeout(() => playTone(600, 'sine', 0.1, 0.08), t * 2)
        setTimeout(() => playTone(800, 'sine', 0.3, 0.12), t * 3)
    },
    playerHit: () => {
        playTone(100, 'sawtooth', 0.2, 0.15, 40)
        playNoise(0.15, 0.1)
    },
    xpPickup: () => {
        playTone(800 + Math.random() * 400, 'sine', 0.06, 0.04)
    },
    bossWarning: () => {
        playTone(80, 'sawtooth', 0.8, 0.2, 60)
        playTone(40, 'square', 0.8, 0.15, 30)
    },
    click: () => {
        playTone(600, 'sine', 0.04, 0.06)
    },
    powerUp: () => {
        playTone(500, 'sine', 0.1, 0.08)
        setTimeout(() => playTone(700, 'sine', 0.2, 0.1), 80)
    },
}
