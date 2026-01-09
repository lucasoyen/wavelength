import { NextRequest, NextResponse } from 'next/server';
import { calculateScore } from '@/app/lib/gameConfig';
import { getGame, saveGame } from '@/app/lib/kv';

// POST /api/game/[gameId]/guess - Submit guess from guesser
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const body = await request.json();
    const { playerId, needleAngle } = body;

    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.bossId === playerId) {
        return NextResponse.json({ error: 'Boss cannot submit a guess' }, { status: 403 });
    }

    if (game.phase !== 'guessing') {
        return NextResponse.json({ error: 'Not in guessing phase' }, { status: 400 });
    }

    game.needleAngle = needleAngle;
    game.phase = 'revealed';

    // Calculate and award points to guesser
    const points = calculateScore(needleAngle, game.targetAngle);
    game.scores[playerId] = (game.scores[playerId] || 0) + points;

    game.lastUpdate = Date.now();

    await saveGame(game);

    return NextResponse.json({ success: true, points });
}
