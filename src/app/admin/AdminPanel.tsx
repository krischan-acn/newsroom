'use client';

import { useEffect, useState } from 'react';

type Row = {
  id: string;
  name: string;
  routeLabel: string;
  active: boolean;
  tally: { a: number; b: number };
};

export default function AdminPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/ab/admin');
    if (!res.ok) {
      setError('Failed to load — session may have expired.');
      return;
    }
    const data = await res.json();
    setRows(data.experiments);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(id: string, active: boolean) {
    setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, active } : r)) ?? prev);
    const res = await fetch('/api/ab/admin/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experimentId: id, active }),
    });
    if (!res.ok) load(); // reconcile on failure
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-xl font-semibold mb-1">A/B experiments</h1>
      <p className="text-sm text-gray-500 mb-8">
        Toggle voting on/off per experiment and watch live tallies. Registry lives in{' '}
        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">src/ab/experiments.ts</code>.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!error && rows === null && <p className="text-sm text-gray-500">Loading…</p>}

      {rows?.length === 0 && (
        <p className="text-sm text-gray-500">No experiments registered yet.</p>
      )}

      <div className="flex flex-col gap-4">
        {rows?.map((row) => {
          const total = row.tally.a + row.tally.b;
          const pctA = total ? Math.round((row.tally.a / total) * 100) : 0;
          return (
            <div key={row.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-gray-500">{row.routeLabel}</div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <span className={row.active ? 'text-green-600' : 'text-gray-400'}>
                    {row.active ? 'Live' : 'Off'}
                  </span>
                  <input
                    type="checkbox"
                    checked={row.active}
                    onChange={(e) => toggle(row.id, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>A · {row.tally.a}</span>
                  <span>{total} vote{total === 1 ? '' : 's'}</span>
                  <span>B · {row.tally.b}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-[var(--accent-color)]" style={{ width: `${pctA}%` }} />
                  <div className="h-full bg-gray-300" style={{ width: `${100 - pctA}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
