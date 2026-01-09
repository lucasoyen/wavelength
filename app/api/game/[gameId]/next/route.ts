import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame } from '@/app/lib/kv';

function generateTargetAngle(): number {
    return Math.random() * 160 - 80;
}

// POST /api/game/[gameId]/next - Start next round
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.phase !== 'revealed') {
        return NextResponse.json({ error: 'Not in revealed phase' }, { status: 400 });
    }

    // Swap boss
    const currentBossIndex = game.players.findIndex(p => p.id === game.bossId);
    const nextBossIndex = (currentBossIndex + 1) % game.players.length;
    game.bossId = game.players[nextBossIndex].id;

    // Reset for new round
    game.round += 1;
    game.targetAngle = generateTargetAngle();
    game.scale = null;
    game.hint = null;
    game.needleAngle = null;
    game.phase = 'boss-input';
    game.lastUpdate = Date.now();

    await saveGame(game);

    return NextResponse.json({ success: true });
}
