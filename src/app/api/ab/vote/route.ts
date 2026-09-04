import { NextResponse } from 'next/server';
import { getSession } from '@/ab/session';
import { getExperiment } from '@/ab/experiments';
import { getStore } from '@/ab/store';
import type { VoteChoice } from '@/ab/store';

// GET /api/ab/vote?experimentId=xxx -> { voted: 'a' | 'b' | null }
// Deliberately never returns the tally here — results stay hidden from
// voters (only /admin, kris-only, can see counts).
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const experimentId = new URL(req.url).searchParams.get('experimentId');
  if (!experimentId || !getExperiment(experimentId)) {
    return NextResponse.json({ error: 'Unknown experiment' }, { status: 400 });
  }

  const store = await getStore();
  const voted = await store.getVote(experimentId, session.username);
  return NextResponse.json({ voted });
}

// POST { experimentId, choice: 'a' | 'b' } -> casts or changes this
// employee's vote. One vote per person per experiment, editable.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { experimentId?: string; choice?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { experimentId, choice } = body;
  if (!experimentId || !getExperiment(experimentId)) {
    return NextResponse.json({ error: 'Unknown experiment' }, { status: 400 });
  }
  if (choice !== 'a' && choice !== 'b') {
    return NextResponse.json({ error: 'Choice must be "a" or "b"' }, { status: 400 });
  }

  const store = await getStore();
  if (!(await store.isActive(experimentId))) {
    return NextResponse.json({ error: 'Voting is closed for this experiment' }, { status: 403 });
  }

  await store.castVote(experimentId, session.username, choice as VoteChoice);
  return NextResponse.json({ ok: true, choice });
}
