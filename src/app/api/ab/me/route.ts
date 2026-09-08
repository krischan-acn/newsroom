import { NextResponse } from 'next/server';
import { getSession } from '@/ab/session';

// Anonymous is a normal state, not an error, so it answers 200 with a null
// session rather than 401. This endpoint is called from AbOverlay on every page
// load, and returning 401 put a red "Failed to load resource" line in the
// console of every visitor to the site — including the public ones who will
// never have an A/B session at all.
//
// The body is unchanged either way ({ session: null }), and the only caller
// already read it the same way for ok and non-ok responses.
export async function GET() {
  const session = await getSession();
  return NextResponse.json({ session: session ?? null });
}
