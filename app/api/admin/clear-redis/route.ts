import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';

export async function POST(request: NextRequest) {
    // Simple secret key protection
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    const adminKey = process.env.ADMIN_KEY;

    if (!adminKey) {
        return NextResponse.json({ error: 'ADMIN_KEY not configured' }, { status: 500 });
    }

    if (key !== adminKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        return NextResponse.json({ error: 'REDIS_URL not configured' }, { status: 500 });
    }

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
    });

    try {
        const gameKeys = await redis.keys('game:*');

        if (gameKeys.length === 0) {
            await redis.quit();
            return NextResponse.json({ message: 'No games found', deleted: 0 });
        }

        const deleted = await redis.del(...gameKeys);
        await redis.quit();

        return NextResponse.json({
            message: `Cleared ${deleted} game(s)`,
            deleted,
            keys: gameKeys
        });
    } catch (error) {
        await redis.quit();
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// Also support GET for easy browser access
export async function GET(request: NextRequest) {
    return POST(request);
}
