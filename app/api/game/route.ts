import { NextRequest, NextResponse } from 'next/server';
import { GameState, createGame } from '@/app/lib/kv';
import { generateTargetAngle } from '@/app/lib/gameConfig';

function generateGameCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// POST /api/game - Create a new game
export async function POST(request: NextRequest) {
    const body = await request.json();
    const { playerId, playerName } = body;

    if (!playerId || !playerName) {
        return NextResponse.json({ error: 'Missing playerId or playerName' }, { status: 400 });
    }

    // Generate unique game code
    let gameId = generateGameCode();
    // In KV we trust the createGame check for uniqueness (nx: true)
    // For simplicity we try once, if fail client can retry, or we loop here.
    // Let's loop a few times to be safe.
    let created = false;
    let attempts = 0;

    let gameState: GameState;

    while (!created && attempts < 5) {
        gameState = {
            gameId,
            players: [{ id: playerId, name: playerName }],
            round: 1,
            scores: { [playerId]: 0 },
            bossId: playerId,
            targetAngle: generateTargetAngle(),
            scale: null,
            hint: null,
            needleAngle: null,
            phase: 'waiting',
            chat: [],
            lastUpdate: Date.now(),
        };

        created = await createGame(gameState);
        if (!created) {
            gameId = generateGameCode();
            attempts++;
        }
    }

    if (!created) {
        return NextResponse.json({ error: 'Failed to create game code, please try again' }, { status: 500 });
    }

    return NextResponse.json(gameState!);
}
