// Upstash Redis driver — one shared REST endpoint, so Vercel and Netlify
// (or any number of deploy targets) read/write the exact same tallies.
// Just paste UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN into both
// hosts' env var settings (same free-tier database, no extra setup).
import 'server-only';
import { Redis } from '@upstash/redis';
import type { AbStore, Tally, VoteChoice } from './store';

const activeKey = (id: string) => `ab:active:${id}`;
const voteKey = (id: string, user: string) => `ab:vote:${id}:${user}`;
const tallyKey = (id: string, choice: VoteChoice) => `ab:tally:${id}:${choice}`;
const activeSetKey = 'ab:active-experiments';

export function createUpstashStore(): AbStore {
  const redis = Redis.fromEnv();

  return {
    async isActive(experimentId) {
      return (await redis.get<string>(activeKey(experimentId))) === '1';
    },

    async setActive(experimentId, active) {
      if (active) {
        await Promise.all([
          redis.set(activeKey(experimentId), '1'),
          redis.sadd(activeSetKey, experimentId),
        ]);
      } else {
        await redis.set(activeKey(experimentId), '0');
      }
    },

    async listActive() {
      const ids = await redis.smembers(activeSetKey);
      if (ids.length === 0) return {};
      const values = await Promise.all(ids.map((id) => redis.get<string>(activeKey(id))));
      const result: Record<string, boolean> = {};
      ids.forEach((id, i) => {
        result[id] = values[i] === '1';
      });
      return result;
    },

    async getVote(experimentId, username) {
      const v = await redis.get<VoteChoice>(voteKey(experimentId, username.toLowerCase()));
      return v ?? null;
    },

    async castVote(experimentId, username, choice) {
      const user = username.toLowerCase();
      const previous = await redis.get<VoteChoice>(voteKey(experimentId, user));
      if (previous === choice) return; // no-op, vote unchanged

      await redis.set(voteKey(experimentId, user), choice);
      if (previous) await redis.decr(tallyKey(experimentId, previous));
      await redis.incr(tallyKey(experimentId, choice));
    },

    async getTally(experimentId) {
      const [a, b] = await Promise.all([
        redis.get<number>(tallyKey(experimentId, 'a')),
        redis.get<number>(tallyKey(experimentId, 'b')),
      ]);
      const tally: Tally = { a: Math.max(0, a ?? 0), b: Math.max(0, b ?? 0) };
      return tally;
    },
  };
}
