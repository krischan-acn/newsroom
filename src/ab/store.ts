// Server-only vote/active-state storage, with two interchangeable drivers:
//  - Upstash Redis, used automatically when UPSTASH_REDIS_REST_URL/TOKEN are set
//    (works identically from Vercel and Netlify — it's a plain HTTPS REST call,
//    not a TCP connection, so there's nothing host-specific to configure).
//  - A local JSON file under .ab-data/, used when those env vars are absent
//    (local dev). Gitignored; does not persist across serverless deploys.
import 'server-only';

export type VoteChoice = 'a' | 'b';
export type Tally = { a: number; b: number };

export interface AbStore {
  isActive(experimentId: string): Promise<boolean>;
  setActive(experimentId: string, active: boolean): Promise<void>;
  getVote(experimentId: string, username: string): Promise<VoteChoice | null>;
  castVote(experimentId: string, username: string, choice: VoteChoice): Promise<void>;
  getTally(experimentId: string): Promise<Tally>;
  /** experimentId -> active, for every experiment that has ever been toggled */
  listActive(): Promise<Record<string, boolean>>;
}

let storePromise: Promise<AbStore> | null = null;

export function getStore(): Promise<AbStore> {
  if (!storePromise) {
    storePromise =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? import('./store.upstash').then((m) => m.createUpstashStore())
        : import('./store.local').then((m) => m.createLocalStore());
  }
  return storePromise;
}
