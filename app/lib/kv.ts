import { kv } from '@vercel/kv';

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
        return await kv.get<GameState>(`game:${gameId.toUpperCase()}`);
    } catch (error) {
        console.error('KV Get Error:', error);
        return null;
    }
}

export async function saveGame(game: GameState): Promise<void> {
    try {
        await kv.set(`game:${game.gameId.toUpperCase()}`, game, { ex: GAME_EXPIRY_SECONDS });
    } catch (error) {
        console.error('KV Set Error:', error);
    }
}

export async function createGame(game: GameState): Promise<boolean> {
    try {
        const key = `game:${game.gameId.toUpperCase()}`;
        // nx: true ensures we don't overwrite an existing game with the same code
        const result = await kv.set(key, game, { ex: GAME_EXPIRY_SECONDS, nx: true });
        return result === 'OK';
    } catch (error) {
        console.error('KV Create Error:', error);
        return false;
    }
}
