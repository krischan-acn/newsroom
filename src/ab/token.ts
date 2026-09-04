// Server-only. Signs and verifies the tiny session token stored in the
// ab_session cookie: base64url(payload json) + "." + base64url(hmac-sha256).
import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { AB_SECRET } from './config';

export type SessionPayload = {
  u: string; // username (lowercase)
  exp: number; // epoch ms
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function sign(payload: string): string {
  return createHmac('sha256', AB_SECRET).update(payload).digest('base64url');
}

export function createToken(username: string, hours: number): string {
  const payload: SessionPayload = { u: username, exp: Date.now() + hours * 3_600_000 };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string | undefined | null): SessionPayload | null {
  if (!token || !AB_SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (typeof payload.u !== 'string' || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
