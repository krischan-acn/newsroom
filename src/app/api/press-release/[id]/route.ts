import { fetchPressRelease } from '@/services/press-release';
import { articlePath } from '@/services/acn-adapter';
import type { PressReleaseResponse } from '@/types/press-release';
import { NextResponse } from 'next/server';

type Context = {
  params: Promise<{ id: string }>
}

export async function GET(
  _req: Request,
  context: Context
) {
  try {
    const { id } = await context.params;
    const data = await fetchPressRelease(Number(id));
    const body: PressReleaseResponse = { ...data, urlPath: articlePath(data) };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}