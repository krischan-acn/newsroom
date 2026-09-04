import { NextResponse } from 'next/server';
import { verifyCredentials } from '@/ab/config';
import { createSessionCookie } from '@/ab/session';

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { username, password } = body;
  if (!username || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const user = verifyCredentials(username, password);
  if (!user) {
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  await createSessionCookie(user);
  return NextResponse.json({ ok: true, username: user });
}
