// Server-only. Never import this from a Client Component — it reads
// credentials out of process.env and must not end up in the browser bundle.
import 'server-only';

function parseUsers(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;
  for (const pair of raw.split(',')) {
    const [user, pass] = pair.split(':');
    if (user && pass) map.set(user.trim().toLowerCase(), pass.trim());
  }
  return map;
}

function parseAdmins(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(raw.split(',').map((u) => u.trim().toLowerCase()).filter(Boolean));
}

export const AB_USERS = parseUsers(process.env.AB_USERS);
export const AB_ADMINS = parseAdmins(process.env.AB_ADMINS);
export const AB_SECRET = process.env.AB_SECRET ?? '';

export const AB_COOKIE_NAME = 'ab_session';
export const AB_SESSION_HOURS = 12;

export function isAdmin(username: string): boolean {
  return AB_ADMINS.has(username.trim().toLowerCase());
}

export function verifyCredentials(username: string, password: string): string | null {
  const key = username.trim().toLowerCase();
  const expected = AB_USERS.get(key);
  if (!expected || expected !== password) return null;
  return key;
}
