'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Entry = { uid?: string; username: string; totalWager: number; avatar?: string };

const REF_CODE = process.env.NEXT_PUBLIC_STREAM_REF_CODE || 'YOURCODE';
const fmtUSD = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

// ==== Dates (ET) ====
function monthKeyET(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value ?? '2025';
  const m = parts.find(p => p.type === 'month')?.value ?? '09';
  return `${y}-${m}`;
}
function monthRangeFromKeyET(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  const next = new Date(Date.UTC(y, (m ?? 1), 1));
  const last = new Date(next.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x);
  return { start_at: fmt(first), end_at: fmt(last) };
}

const prizeForRank = (rank: number) => {
  if (rank === 1) return '$500 + Shoutout';
  if (rank === 2) return '$250';
  if (rank === 3) return '$100';
  if (rank <= 10) return '$25 Bonus';
  return '—';
};

// ===== Podium (simple, no circles) =====
function Podium({ top3 }: { top3: Entry[] }) {
  const one = top3[0];
  const two = top3[1];
  const three = top3[2];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 2nd */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Second</div>
        <div className="mt-1 text-lg font-semibold text-slate-900 truncate">{two?.username ?? '—'}</div>
        <div className="mt-1 text-slate-700">{fmtUSD(Number(two?.totalWager || 0))}</div>
      </div>

      {/* 1st */}
      <div className="rounded-2xl border-2 border-amber-400 bg-white p-6 shadow-md md:-mt-4">
        <div className="text-xs uppercase tracking-wide text-slate-600">Champion</div>
        <div className="mt-1 text-xl font-extrabold text-slate-900 truncate">{one?.username ?? '—'}</div>
        <div className="mt-1 font-semibold text-slate-800">{fmtUSD(Number(one?.totalWager || 0))}</div>
        <div className="mt-3 h-1 w-full rounded bg-gradient-to-r from-amber-400 via-amber-300 to-amber-200" />
      </div>

      {/* 3rd */}
      <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-slate-500">Third</div>
        <div className="mt-1 text-lg font-semibold text-slate-900 truncate">{three?.username ?? '—'}</div>
        <div className="mt-1 text-slate-700">{fmtUSD(Number(three?.totalWager || 0))}</div>
      </div>
    </div>
  );
}

export default function Page() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(monthKeyET());
  const [updatedAt, setUpdatedAt] = useState<string>('');

  // last 6 months
  const monthOptions = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = monthKeyET(d);
      const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
      arr.push({ key, label });
    }
    return arr;
  }, []);

  // fetch for selected month
  useEffect(() => {
    const { start_at, end_at } = monthRangeFromKeyET(selectedMonth);
    const url = `/api/leaderboard?start_at=${start_at}&end_at=${end_at}`;

    let cancel = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const list: Entry[] = Array.isArray(json?.entries) ? json.entries : [];
        if (!cancel) {
          setEntries(list);
          setUpdatedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      } catch (e: any) {
        if (!cancel) {
          setErr(e?.message || 'Failed to load leaderboard');
          setEntries([]);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => { cancel = true; };
  }, [selectedMonth]);

  const filtered = useMemo(() => {
    const rows = (entries || []).slice().sort((a, b) => Number(b.totalWager || 0) - Number(a.totalWager || 0));
    const qq = q.trim().toLowerCase();
    const searched = qq ? rows.filter(r => (r.username || '').toLowerCase().includes(qq)) : rows;
    return { top10: searched.slice(0, 10), all: searched };
  }, [entries, q]);

  const podium = filtered.top10.slice(0, 3);
  const afterPodium = filtered.top10.slice(3);

  // brand
  const brandNavy = '#0B1535';   // Rainbet-like navy
  const brandBlue = '#2EC4FF';   // accent cyan/blue

  return (
    <div className="min-h-screen">
      {/* HERO / NAV (nav sits on navy bar) */}
      <header className="text-white" style={{ backgroundColor: brandNavy }}>
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Monthly Wager Race</h1>
              <p className="text-xs md:text-sm text-white/80">
                Play under code <span className="font-semibold" style={{ color: brandBlue }}>{REF_CODE}</span> to enter
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-white/85">
            <a href="#top10" className="hover:text-white">Top 10</a>
            <a href="#how" className="hover:text-white">How to Join</a>
            <a href="#prizes" className="hover:text-white">Prizes</a>
            <a href="#fair" className="hover:text-white">Fair Play</a>
            <a href="#contact" className="hover:text-white">Contact</a>
          </nav>
        </div>
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${brandBlue}, #0EA5E9 60%, #0369A1)` }} />
      </header>

      {/* DARK SECTION WRAPPER (navy background) */}
      <div className="w-full" style={{ backgroundColor: brandNavy }}>
        {/* Controls */}
        <section className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search players…"
                className="w-full rounded-xl border border-white/15 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="rounded-xl border border-white/15 bg-white px-3 py-2 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end text-sm text-white/80">
              {loading ? <span className="animate-pulse">Loading…</span> : (
                <span>Last updated {updatedAt || '—'} ET{err && <span className="ml-2 text-amber-300"> • {err}</span>}</span>
              )}
            </div>
          </div>
        </section>

        {/* Podium */}
        <section className="mx-auto max-w-6xl px-4 pb-6">
          {podium.length > 0 && <Podium top3={podium} />}
        </section>
      </div>

      {/* MAIN CONTENT on light surface */}
      <main id="top10" className="mx-auto max-w-6xl px-4 -mt-8 pb-12">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Top 10</h2>
          <span className="text-sm text-slate-600">Showing {filtered.top10.length} / {filtered.all.length} players</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-sky-50">
              <tr className="text-xs uppercase tracking-wide text-slate-700">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Total Wager</th>
                <th className="px-4 py-3">Prize</th>
              </tr>
            </thead>
            <tbody>
              {afterPodium.map((row, idx) => {
                const rank = idx + 4;
                return (
                  <tr key={(row.uid || row.username) + idx} className="border-t border-slate-200 hover:bg-sky-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{rank}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.username || 'Player'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmtUSD(Number(row.totalWager || 0))}</td>
                    <td className="px-4 py-3 text-slate-800">{prizeForRank(rank)}</td>
                  </tr>
                );
              })}
              {!loading && filtered.top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No players this month yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Full list */}
        {filtered.all.length > 10 && (
          <details className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 open:shadow-sm">
            <summary className="cursor-pointer select-none font-medium text-slate-900">
              View full leaderboard ({filtered.all.length})
            </summary>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-sky-50">
                  <tr className="text-xs uppercase tracking-wide text-slate-700">
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Total Wager</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.all.map((row, i) => (
                    <tr key={(row.uid || row.username) + 'all' + i} className="border-t border-slate-200 hover:bg-sky-50/70">
                      <td className="px-3 py-2">{i + 1}</td>
                      <td className="px-3 py-2">{row.username || 'Player'}</td>
                      <td className="px-3 py-2 font-semibold">{fmtUSD(Number(row.totalWager || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </main>

      {/* How to Join */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-4">How to Join</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">1️⃣</div>
            <p>Create a casino account with code <span className="font-semibold" style={{ color: brandNavy }}>{REF_CODE}</span>.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">2️⃣</div>
            <p>Wager during the month (ET). Every $1 wagered counts toward the leaderboard.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">3️⃣</div>
            <p>Finish top 10 to win prizes. Winners announced within 48 hours after month end.</p>
          </li>
        </ol>
        <a
          href="https://YOUR-CASINO-REF-LINK"
          className="mt-6 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition"
          style={{ background: `linear-gradient(90deg, ${brandBlue}, #0EA5E9 60%, #0369A1)` }}
          target="_blank"
          rel="noreferrer"
        >
          Join with {REF_CODE}
        </a>
      </section>

      {/* Prizes & Payouts */}
      <section id="prizes" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-4">Prizes & Payouts</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[1,2,3,4,5,6,7,8,9,10].map(r => (
            <div key={r} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
              <span className="font-medium text-slate-900">Place {r}</span>
              <span className="text-slate-900">{prizeForRank(r)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 mt-3">
          Payouts are typically via site bonus or direct payment depending on availability. Identification may be required.
        </p>
      </section>

      {/* Fair Play */}
      <section id="fair" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-4">Fair Play Rules</h2>
        <ul className="space-y-2 text-sm text-slate-800">
          <li>• One account per person. Duplicate or shared accounts may be disqualified.</li>
          <li>• Self-excluded, bonus-abuse, or fraudulent activity voids eligibility.</li>
          <li>• Wagers must be placed within the calendar month (Eastern Time).</li>
          <li>• We reserve the right to verify identity and adjust totals for errors or reversals.</li>
          <li>• Final standings posted within 48 hours after month end.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer id="contact" className="mt-16 border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-lg font-bold text-slate-900">ImSquanto Gaming LLC</div>
            <p className="text-sm text-slate-600 mt-1">
              Community tournaments & monthly wager races. Must be of legal age in your jurisdiction.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Gamble responsibly. If you or someone you know has a gambling problem and wants help, call the National Problem Gambling Helpline at 1-800-522-4700 or visit{' '}
              <a className="underline" href="https://www.ncpgambling.org" target="_blank" rel="noreferrer">ncpgambling.org</a>.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-2">Links</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline" href="/terms">Terms</a></li>
              <li><a className="hover:underline" href="/privacy">Privacy</a></li>
              <li><a className="hover:underline" href="/responsible-gaming">Responsible Gaming</a></li>
              <li><a className="hover:underline" href="mailto:contact@squantogaming.com">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-2">Social</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline" href="https://discord.gg/YOURCODE" target="_blank" rel="noreferrer">Discord</a></li>
              <li><a className="hover:underline" href="https://twitch.tv/YOURHANDLE" target="_blank" rel="noreferrer">Twitch</a></li>
              <li><a className="hover:underline" href="https://x.com/YOURHANDLE" target="_blank" rel="noreferrer">X / Twitter</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-slate-500">
          © 2025 ImSquanto Gaming LLC — All rights reserved.
        </div>
      </footer>
    </div>
  );
}
