'use client';

import React, { useEffect, useState } from 'react';

type Entry = { uid?: string; username: string; totalWager: number; rank?: number };

const formatUSD = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // For testing a fixed window, uncomment:
  // const apiPath = `/api/leaderboard?start_at=2025-09-10&end_at=2025-09-30`;
  // For auto current month (ET), use:
  const apiPath = `/api/leaderboard`;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(apiPath, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: Entry[] = Array.isArray(json?.entries) ? json.entries : [];
        setEntries(list);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load leaderboard');
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiPath]);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-bold">Monthly Wager Leaderboard</h1>
        {err ? (
          <p className="mt-2 text-sm text-red-600">Error: {err}</p>
        ) : (
          <p className="mt-2 text-sm text-zinc-600">
            {loading ? 'Loading…' : `Showing ${entries.length} players`}
          </p>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Total Wager</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={(e.uid || e.username) + i} className="border-t">
                  <td className="px-4 py-3 font-semibold">{(e as any).rank ?? i + 1}</td>
                  <td className="px-4 py-3">{e.username || 'Player'}</td>
                  <td className="px-4 py-3 font-semibold">{formatUSD(Number(e.totalWager || 0))}</td>
                </tr>
              ))}
              {!loading && entries.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-zinc-500">
                    No players in this range yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 rounded-2xl border p-5">
          <p className="text-sm text-zinc-600">
            Use code <span className="font-semibold">{process.env.NEXT_PUBLIC_STREAM_REF_CODE}</span> to join the race.
          </p>
        </div>
      </main>
    </div>
  );
}
