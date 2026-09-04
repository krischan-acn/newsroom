import { NextResponse } from 'next/server';
import { getSession } from '@/ab/session';
import { EXPERIMENTS } from '@/ab/experiments';
import { getStore } from '@/ab/store';

// GET /api/ab/admin — kris-only. Lists every registered experiment with its
// on/off state and vote tally.
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const store = await getStore();
  const rows = await Promise.all(
    EXPERIMENTS.map(async (exp) => ({
      id: exp.id,
      name: exp.name,
      routeLabel: exp.routeLabel,
      active: await store.isActive(exp.id),
      tally: await store.getTally(exp.id),
    }))
  );

  return NextResponse.json({ experiments: rows });
}
