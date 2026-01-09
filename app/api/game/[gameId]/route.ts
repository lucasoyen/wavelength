import { NextRequest, NextResponse } from 'next/server';
import { getGame } from '@/app/lib/kv';

// GET /api/game/[gameId] - Get game state
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(game);
}
