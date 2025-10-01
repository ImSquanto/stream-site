'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Entry = { uid?: string; username: string; totalWager: number; avatar?: string };

const REF_CODE = process.env.NEXT_PUBLIC_STREAM_REF_CODE || 'YOURCODE';
const fmtUSD = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

// Build YYYY-MM (ET)
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

// First/last day (YYYY-MM-DD) for a given YYYY-MM in ET
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

function Podium({ top3 }: { top3: Entry[] }) {
  const one = top3[0];
  const two = top3[1];
  const three = top3[2];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 2nd */}
      <div className="card p-6 text-center">
        <div className="text-3xl">🥈</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-white/70">Second</div>
        <div className="mt-1 text-lg font-semibold">{two?.username ?? '—'}</div>
        <div className="mt-1 text-white/80">{fmtUSD(Number(two?.totalWager || 0))}</div>
      </div>
      {/* 1st */}
      <div className="rounded-2xl border-2 border-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/40 via-[#FDE68A]/30 to-transparent p-7 shadow-md text-center md:-mt-4">
        <div className="text-4xl">👑</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-white/80">Champion</div>
        <div className="mt-1 text-xl font-extrabold">{one?.username ?? '—'}</div>
        <div className="mt-1 font-semibold">{fmtUSD(Number(one?.totalWager || 0))}</div>
      </div>
      {/* 3rd */}
      <div className="card p-6 text-center">
        <div className="text-3xl">🥉</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-white/70">Third</div>
        <div className="mt-1 text-lg font-semibold">{three?.username ?? '—'}</div>
        <div className="mt-1 text-white/80">{fmtUSD(Number(three?.totalWager || 0))}</div>
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

  return (
    <div className="relative min-h-screen text-[var(--brand-text)]">
      {/* HERO / NAV */}
      <header className="relative z-10 border-b border-white/10 bg-[var(--brand-bg)]/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Monthly Wager Race
              </h1>
              <p className="text-sm text-white/80 mt-1">
                Play under code <span className="font-semibold text-[#2EC4FF]">{REF_CODE}</span> to enter
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
        <div className="h-1 w-full bg-gradient-to-r from-[#2EC4FF] via-[#0EA5E9] to-[#0369A1]" />
      </header>

      {/* CONTROLS */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players…"
              className="input w-full"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key} className="bg-[var(--brand-bg)]">
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end text-sm text-white/80">
            {loading ? <span className="animate-pulse">Loading…</span> : (
              <span>
                Last updated {updatedAt || '—'} ET
                {err && <span className="ml-2 text-amber-300"> • {err}</span>}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* PODIUM */}
      <section className="relative z-10 mx-auto max-w-6xl px-4">
        {podium.length > 0 && <Podium top3={podium} />}
      </section>

      {/* TOP 10 TABLE */}
      <main id="top10" className="relative z-10 mx-auto max-w-6xl px-4 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Top 10</h2>
          <span className="text-sm text-white/75">
            Showing {filtered.top10.length} / {filtered.all.length} players
          </span>
        </div>

        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Total Wager</th>
                <th>Prize</th>
              </tr>
            </thead>
            <tbody>
              {/* rows 4-10 (top 3 are in podium) */}
              {afterPodium.map((row, idx) => {
                const rank = idx + 4;
                return (
                  <tr key={(row.uid || row.username) + idx}>
                    <td className="font-semibold">{rank}</td>
                    <td className="font-semibold">{row.username || 'Player'}</td>
                    <td className="font-semibold">{fmtUSD(Number(row.totalWager || 0))}</td>
                    <td>{prizeForRank(rank)}</td>
                  </tr>
                );
              })}
              {!loading && filtered.top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-white/70">
                    No players this month yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Full list */}
        {filtered.all.length > 10 && (
          <details className="card mt-4 p-4 open:shadow-sm">
            <summary className="cursor-pointer select-none font-medium">
              View full leaderboard ({filtered.all.length})
            </summary>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Total Wager</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.all.map((row, i) => (
                    <tr key={(row.uid || row.username) + 'all' + i}>
                      <td>{i + 1}</td>
                      <td>{row.username || 'Player'}</td>
                      <td className="font-semibold">{fmtUSD(Number(row.totalWager || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </main>

      {/* How to Join */}
      <section id="how" className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight mb-4">How to Join</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          <li className="card p-5">
            <div className="text-2xl mb-2">1️⃣</div>
            <p>
              Create a casino account with code <span className="font-semibold text-[#2EC4FF]">{REF_CODE}</span>.
            </p>
          </li>
          <li className="card p-5">
            <div className="text-2xl mb-2">2️⃣</div>
            <p>Wager during the month (ET). Every $1 wagered counts toward the leaderboard.</p>
          </li>
          <li className="card p-5">
            <div className="text-2xl mb-2">3️⃣</div>
            <p>Finish top 10 to win prizes. Winners announced within 48 hours after month end.</p>
          </li>
        </ol>
        <a href="https://YOUR-CASINO-REF-LINK" className="btn mt-6" target="_blank" rel="noreferrer">
          Join with {REF_CODE}
        </a>
      </section>

      {/* Prizes & Payouts */}
      <section id="prizes" className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Prizes & Payouts</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[1,2,3,4,5,6,7,8,9,10].map(r => (
            <div key={r} className="card p-4 flex items-center justify-between">
              <span className="font-medium">Place {r}</span>
              <span>{prizeForRank(r)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-white/70 mt-3">
          Payouts are typically via site bonus or direct payment depending on availability. Identification may be required.
        </p>
      </section>

      {/* Fair Play */}
      <section id="fair" className="relative z-10 mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight mb-4">Fair Play Rules</h2>
        <ul className="space-y-2 text-sm">
          <li>• One account per person. Duplicate or shared accounts may be disqualified.</li>
          <li>• Self-excluded, bonus-abuse, or fraudulent activity voids eligibility.</li>
          <li>• Wagers must be placed within the calendar month (Eastern Time).</li>
          <li>• We reserve the right to verify identity and adjust totals for errors or reversals.</li>
          <li>• Final standings posted within 48 hours after month end.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer id="contact" className="relative z-10 mt-16 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-lg font-bold">ImSquanto Gaming LLC</div>
            <p className="text-sm text-white/80 mt-1">
              Community tournaments & monthly wager races. Must be of legal age in your jurisdiction.
            </p>
            <p className="text-xs text-white/70 mt-2">
              Gamble responsibly. If you or someone you know has a gambling problem and wants help, call the National Problem Gambling Helpline at 1-800-522-4700 or visit{' '}
              <a className="underline" href="https://www.ncpgambling.org" target="_blank" rel="noreferrer">ncpgambling.org</a>.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-2">Links</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline" href="/terms">Terms</a></li>
              <li><a className="hover:underline" href="/privacy">Privacy</a></li>
              <li><a className="hover:underline" href="/responsible-gaming">Responsible Gaming</a></li>
              <li><a className="hover:underline" href="mailto:contact@squantogaming.com">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-2">Social</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline" href="https://discord.gg/YOURCODE" target="_blank" rel="noreferrer">Discord</a></li>
              <li><a className="hover:underline" href="https://twitch.tv/YOURHANDLE" target="_blank" rel="noreferrer">Twitch</a></li>
              <li><a className="hover:underline" href="https://x.com/YOURHANDLE" target="_blank" rel="noreferrer">X / Twitter</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/70">
          © 2025 ImSquanto Gaming LLC — All rights reserved.
        </div>
      </footer>
    </div>
  );
}
