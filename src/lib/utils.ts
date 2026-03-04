export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 700

// Huge map size for camera system
export const WORLD_WIDTH = 4000
export const WORLD_HEIGHT = 4000

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
export const dist = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
export const distSq = (x1: number, y1: number, x2: number, y2: number) => (x2 - x1) ** 2 + (y2 - y1) ** 2
export const angle = (x1: number, y1: number, x2: number, y2: number) => Math.atan2(y2 - y1, x2 - x1)
export const rnd = (min: number, max: number) => Math.random() * (max - min) + min
export const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1))
export const chance = (p: number) => Math.random() < p
export const pick = <T,>(arr: T[]): T | undefined => arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
