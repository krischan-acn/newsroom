import { NextResponse } from 'next/server';
import { getSession } from '@/ab/session';
import { findExperimentForPath } from '@/ab/experiments';
import { getStore } from '@/ab/store';

// GET /api/ab/experiments?path=/article/123/slug
// Returns the single active experiment (if any) that matches this path.
// Requires an employee session — the registry/route-matching logic isn't
// meant to be probeable by anonymous visitors.
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pathname = new URL(req.url).searchParams.get('path');
  if (!pathname) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  const experiment = findExperimentForPath(pathname);
  if (!experiment) return NextResponse.json({ experiment: null });

  const store = await getStore();
  const active = await store.isActive(experiment.id);
  if (!active) return NextResponse.json({ experiment: null });

  return NextResponse.json({
    experiment: { id: experiment.id, name: experiment.name },
  });
}
