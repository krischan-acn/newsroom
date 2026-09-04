// Server-only session helpers built on the Next.js cookies() API.
import 'server-only';
import { cookies } from 'next/headers';
import { AB_COOKIE_NAME, AB_SESSION_HOURS, isAdmin } from './config';
import { createToken, verifyToken } from './token';

export type Session = { username: string; isAdmin: boolean };

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const payload = verifyToken(store.get(AB_COOKIE_NAME)?.value);
  if (!payload) return null;
  return { username: payload.u, isAdmin: isAdmin(payload.u) };
}

export async function createSessionCookie(username: string) {
  const store = await cookies();
  store.set(AB_COOKIE_NAME, createToken(username, AB_SESSION_HOURS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AB_SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(AB_COOKIE_NAME);
}
