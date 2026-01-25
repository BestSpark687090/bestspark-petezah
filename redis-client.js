import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

if (!REDIS_PASSWORD) {
  throw new Error('REDIS_PASSWORD environment variable must be set');
}

export const redis = new Redis({
  host: REDIS_HOST,
  port: 6379,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableOfflineQueue: false,
  lazyConnect: false
});

export const redisSub = redis.duplicate();

redis.on('connect', () => {
  console.log(`[Redis] Connected to ${REDIS_HOST}:6379`);
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

redis.on('ready', () => {
  console.log('[Redis] Ready to accept commands');
});

redis.ping().then(() => {
  console.log('[Redis] PONG - Connection successful');
}).catch((err) => {
  console.error('[Redis] PING failed:', err.message);
  process.exit(1);
});
