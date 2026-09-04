import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/ab/session';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
