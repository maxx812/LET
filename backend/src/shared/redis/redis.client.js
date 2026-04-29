import Redis from "ioredis";
import { config } from "../../config/env.js";

let redisClient = null;
let usingFallbackRedis = false;

function createInMemoryRedis() {
  const hashes = new Map();
  const sets = new Map();
  const zsets = new Map();

  function getHash(key) {
    if (!hashes.has(key)) hashes.set(key, new Map());
    return hashes.get(key);
  }

  function getSet(key) {
    if (!sets.has(key)) sets.set(key, new Set());
    return sets.get(key);
  }

  function getZset(key) {
    if (!zsets.has(key)) zsets.set(key, new Map());
    return zsets.get(key);
  }

  function sortZsetEntries(map) {
    return [...map.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return String(a[0]).localeCompare(String(b[0]));
    });
  }

  return {
    status: "ready",
    isFallback: true,
    on() {},
    async connect() {},
    disconnect() {},
    async quit() {},
    pipeline() {
      const ops = [];
      const self = this;
      const push = (method, ...args) => {
        ops.push([method, args]);
        return pipelineApi;
      };
      const pipelineApi = {
        hset: (...args) => push("hset", ...args),
        expire: (...args) => push("expire", ...args),
        sadd: (...args) => push("sadd", ...args),
        zadd: (...args) => push("zadd", ...args),
        hdel: (...args) => push("hdel", ...args),
        hget: (...args) => push("hget", ...args),
        hgetall: (...args) => push("hgetall", ...args),
        exec: async () => {
          const results = [];
          for (const [method, args] of ops) {
            const value = await self[method](...args);
            results.push([null, value]);
          }
          return results;
        }
      };
      return pipelineApi;
    },
    async hlen(key) {
      return getHash(key).size;
    },
    async hset(key, fieldOrObj, maybeValue) {
      const hash = getHash(key);
      if (typeof fieldOrObj === "object" && fieldOrObj !== null) {
        for (const [field, value] of Object.entries(fieldOrObj)) {
          hash.set(String(field), String(value));
        }
        return 1;
      }
      hash.set(String(fieldOrObj), String(maybeValue));
      return 1;
    },
    async hgetall(key) {
      const hash = getHash(key);
      const obj = {};
      for (const [field, value] of hash.entries()) obj[field] = value;
      return obj;
    },
    async hget(key, field) {
      return getHash(key).get(String(field)) ?? null;
    },
    async hdel(key, field) {
      return getHash(key).delete(String(field)) ? 1 : 0;
    },
    async sadd(key, ...members) {
      const set = getSet(key);
      for (const member of members) set.add(String(member));
      return set.size;
    },
    async smembers(key) {
      return [...getSet(key)];
    },
    async srem(key, ...members) {
      const set = getSet(key);
      let removed = 0;
      for (const member of members) {
        if (set.delete(String(member))) removed += 1;
      }
      return removed;
    },
    async scard(key) {
      return getSet(key).size;
    },
    async zadd(key, score, member) {
      getZset(key).set(String(member), Number(score));
      return 1;
    },
    async zrevrank(key, member) {
      const entries = sortZsetEntries(getZset(key));
      const index = entries.findIndex(([entryMember]) => entryMember === String(member));
      return index === -1 ? null : index;
    },
    async zrevrange(key, start, end) {
      const entries = sortZsetEntries(getZset(key)).map(([member]) => member);
      return entries.slice(start, end + 1);
    },
    async zcard(key) {
      return getZset(key).size;
    },
    async expire() {
      return 1;
    }
  };
}

function createRedisClient() {
  const client = new Redis(config.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    retryStrategy: null
  });

  client.on("error", (error) => {
    console.error("Redis client error", error);
  });

  return client;
}

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }

  return redisClient;
}

export async function connectRedis() {
  if (usingFallbackRedis) return redisClient;

  const client = getRedisClient();
  if (client.status === "wait" || client.status === "end") {
    try {
      await client.connect();
    } catch (error) {
      console.error("Redis unavailable. Falling back to in-memory cache.", error?.message || error);
      client.disconnect();
      usingFallbackRedis = true;
      redisClient = createInMemoryRedis();
      return redisClient;
    }
  }
  return client;
}

export async function disconnectRedis() {
  if (!redisClient) return;

  try {
    if (redisClient.status === "ready" || redisClient.status === "connect") {
      await redisClient.quit();
    } else {
      redisClient.disconnect();
    }
  } finally {
    usingFallbackRedis = false;
    redisClient = null;
  }
}
