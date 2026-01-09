import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame } from '@/app/lib/kv';

// POST /api/game/[gameId]/hint - Submit hint from boss
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId, scale, hint } = body;

    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.bossId !== playerId) {
        return NextResponse.json({ error: 'Only the boss can submit a hint' }, { status: 403 });
    }

    if (game.phase !== 'boss-input') {
        return NextResponse.json({ error: 'Not in boss-input phase' }, { status: 400 });
    }

    game.scale = scale;
    game.hint = hint;
    game.phase = 'guessing';
    game.lastUpdate = Date.now();

    await saveGame(game);

    return NextResponse.json({ success: true });
}
