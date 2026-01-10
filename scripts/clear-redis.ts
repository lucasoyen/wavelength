#!/usr/bin/env npx ts-node

import Redis from 'ioredis';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local if it exists
function loadEnvLocal() {
    const envPath = resolve(process.cwd(), '.env.local');
    if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match && !process.env[match[1]]) {
                process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
            }
        });
    }
}

loadEnvLocal();

async function clearRedis() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        console.error('Error: REDIS_URL environment variable is not set\n');
        console.log('Options:');
        console.log('  1. Create .env.local with REDIS_URL=your-redis-url');
        console.log('  2. Run: vercel env pull .env.local');
        console.log('  3. Run: REDIS_URL=redis://... npm run clear-redis');
        process.exit(1);
    }

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
    });

    try {
        console.log('Connecting to Redis...');
        await redis.ping();
        console.log('Connected successfully!\n');

        // Find all game keys
        const gameKeys = await redis.keys('game:*');

        if (gameKeys.length === 0) {
            console.log('No game keys found in Redis store.');
        } else {
            console.log(`Found ${gameKeys.length} game key(s):`);
            gameKeys.forEach(key => console.log(`  - ${key}`));

            // Delete all game keys
            const deleted = await redis.del(...gameKeys);
            console.log(`\nDeleted ${deleted} key(s) successfully.`);
        }

        // Option to clear ALL keys (use with caution)
        if (process.argv.includes('--all')) {
            console.log('\n--all flag detected. Clearing ALL keys...');
            await redis.flushdb();
            console.log('All keys in the current database have been cleared.');
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    } finally {
        await redis.quit();
        console.log('\nDisconnected from Redis.');
    }
}

clearRedis();
