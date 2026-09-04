// Local JSON-file driver. Dev only — see store.ts for why this can't be
// relied on in production on Vercel/Netlify (read-only/ephemeral filesystem).
import 'server-only';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { AbStore, Tally, VoteChoice } from './store';

const DIR = path.join(process.cwd(), '.ab-data');
const FILE = path.join(DIR, 'store.json');

type Data = {
  active: Record<string, boolean>;
  votes: Record<string, Record<string, VoteChoice>>;
};

async function load(): Promise<Data> {
  try {
    const raw = await readFile(FILE, 'utf8');
    const data = JSON.parse(raw) as Partial<Data>;
    return { active: data.active ?? {}, votes: data.votes ?? {} };
  } catch {
    return { active: {}, votes: {} };
  }
}

async function save(data: Data): Promise<void> {
  await mkdir(DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Serializes writes within this process so concurrent requests in dev don't
// clobber each other's read-modify-write.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(fn);
  queue = result.catch(() => {});
  return result;
}

export function createLocalStore(): AbStore {
  return {
    async isActive(experimentId) {
      const data = await load();
      return data.active[experimentId] ?? false;
    },

    async setActive(experimentId, active) {
      await enqueue(async () => {
        const data = await load();
        data.active[experimentId] = active;
        await save(data);
      });
    },

    async listActive() {
      const data = await load();
      return data.active;
    },

    async getVote(experimentId, username) {
      const data = await load();
      return data.votes[experimentId]?.[username.toLowerCase()] ?? null;
    },

    async castVote(experimentId, username, choice) {
      await enqueue(async () => {
        const data = await load();
        data.votes[experimentId] ??= {};
        data.votes[experimentId][username.toLowerCase()] = choice;
        await save(data);
      });
    },

    async getTally(experimentId) {
      const data = await load();
      const votes = Object.values(data.votes[experimentId] ?? {});
      const tally: Tally = { a: 0, b: 0 };
      for (const v of votes) tally[v]++;
      return tally;
    },
  };
}
