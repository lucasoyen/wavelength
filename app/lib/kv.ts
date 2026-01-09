import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedis(): Redis {
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL || '', {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
    }
    return redis;
}

export interface GameState {
    gameId: string;
    players: { id: string; name: string }[];
    round: number;
    scores: { [playerId: string]: number };
    bossId: string;
    targetAngle: number;
    scale: { left: string; right: string } | null;
    hint: string | null;
    needleAngle: number | null;
    phase: 'waiting' | 'boss-input' | 'guessing' | 'revealed';
    chat: { sender: string; message: string }[];
    lastUpdate: number;
}

const GAME_EXPIRY_SECONDS = 3600; // 1 hour

export async function getGame(gameId: string): Promise<GameState | null> {
    try {
        const data = await getRedis().get(`game:${gameId.toUpperCase()}`);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Redis Get Error:', error);
        return null;
    }
}

export async function saveGame(game: GameState): Promise<void> {
    try {
        await getRedis().set(
            `game:${game.gameId.toUpperCase()}`,
            JSON.stringify(game),
            'EX',
            GAME_EXPIRY_SECONDS
        );
    } catch (error) {
        console.error('Redis Set Error:', error);
    }
}

export async function createGame(game: GameState): Promise<boolean> {
    try {
        const key = `game:${game.gameId.toUpperCase()}`;
        // NX ensures we don't overwrite an existing game with the same code
        const result = await getRedis().set(
            key,
            JSON.stringify(game),
            'EX',
            GAME_EXPIRY_SECONDS,
            'NX'
        );
        return result === 'OK';
    } catch (error) {
        console.error('Redis Create Error:', error);
        return false;
    }
}
