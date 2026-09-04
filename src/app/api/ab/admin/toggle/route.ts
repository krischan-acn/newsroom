import { NextResponse } from 'next/server';
import { getSession } from '@/ab/session';
import { getExperiment } from '@/ab/experiments';
import { getStore } from '@/ab/store';

// POST { experimentId, active } — kris-only. Flips voting on/off for an
// experiment without a redeploy.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { experimentId?: string; active?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { experimentId, active } = body;
  if (!experimentId || !getExperiment(experimentId) || typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const store = await getStore();
  await store.setActive(experimentId, active);
  return NextResponse.json({ ok: true });
}
