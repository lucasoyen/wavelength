import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame } from '@/app/lib/kv';

// POST /api/game/[gameId]/join - Join an existing game
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId, playerName } = body;

    if (!playerId || !playerName) {
        return NextResponse.json({ error: 'Missing playerId or playerName' }, { status: 400 });
    }

    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Check if player is already in the game
    if (game.players.some(p => p.id === playerId)) {
        return NextResponse.json({ success: true, ...game });
    }

    // Check if game is full
    if (game.players.length >= 2) {
        return NextResponse.json({ error: 'Game is full' }, { status: 400 });
    }

    // Add player
    game.players.push({ id: playerId, name: playerName });
    game.scores[playerId] = 0;

    // If this is the second player joining, verify phase is boss-input
    // (It should already be initialized as waiting, and we can switch to boss-input or just be ready)
    // Actually, createGame sets phase to 'waiting'. If we have 2 players, we can ensure we are in boss-input.
    if (game.phase === 'waiting' && game.players.length === 2) {
        game.phase = 'boss-input';
    }

    game.lastUpdate = Date.now();

    await saveGame(game);

    return NextResponse.json({ success: true, ...game });
}
