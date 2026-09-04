import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/ab/session';
import AdminPanel from './AdminPanel';

// Deliberately 404s for everyone except an already-logged-in admin (kris) —
// no login form lives here. Log in via F2 on any page first.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await getSession();
  if (!session?.isAdmin) notFound();

  return <AdminPanel />;
}
