import { NextRequest, NextResponse } from 'next/server';
import { getGame, saveGame } from '@/app/lib/kv';

// POST /api/game/[gameId]/chat - Send chat message
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ gameId: string }> }
) {
    const { gameId } = await params;
    const body = await request.json();
    const { sender, message } = body;

    const game = await getGame(gameId);

    if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!sender || !message) {
        return NextResponse.json({ error: 'Missing sender or message' }, { status: 400 });
    }

    // Keep only last 50 messages
    if (game.chat.length >= 50) {
        game.chat.shift();
    }

    game.chat.push({ sender, message });
    game.lastUpdate = Date.now();

    await saveGame(game);

    return NextResponse.json({ success: true });
}
