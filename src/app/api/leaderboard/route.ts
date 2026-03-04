import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the shape of a leaderboard entry
export interface LeaderboardEntry {
    name: string;
    score: number;
    mode: string;
    date: string;
}

const LEADERBOARD_FILE = path.join(process.cwd(), 'leaderboard.json');

// Helper to read the leaderboard
function getLeaderboard(): LeaderboardEntry[] {
    try {
        if (!fs.existsSync(LEADERBOARD_FILE)) {
            return [];
        }
        const data = fs.readFileSync(LEADERBOARD_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading leaderboard:", e);
        return [];
    }
}

// Helper to save the leaderboard
function saveLeaderboard(entries: LeaderboardEntry[]) {
    try {
        // Sort descending by score and keep top 50
        entries.sort((a, b) => b.score - a.score);
        const topEntries = entries.slice(0, 50);
        fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(topEntries, null, 2));
    } catch (e) {
        console.error("Error writing leaderboard:", e);
    }
}

export async function GET() {
    const entries = getLeaderboard();
    return NextResponse.json(entries);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, score, mode } = body;

        if (!name || typeof score !== 'number' || !mode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const entries = getLeaderboard();
        entries.push({
            name,
            score,
            mode,
            date: new Date().toISOString()
        });

        saveLeaderboard(entries);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Error processing score submission:", e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
