'use client';

import React, { useEffect, useMemo, useState } from 'react';

type Entry = { uid?: string; username: string; totalWager: number; avatar?: string };

const REF_CODE = process.env.NEXT_PUBLIC_STREAM_REF_CODE || 'YOURCODE';
const fmtUSD = (n: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

// Build YYYY-MM for "current month in ET" (for the dropdown default)
function monthKeyET(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')?.value ?? '2025';
  const m = parts.find(p => p.type === 'month')?.value ?? '10';
  return `${y}-${m}`;
}

// First/last day (YYYY-MM-DD) for a given YYYY-MM (NO timezone conversion)
function monthRangeFromKeyET(ym: string) {
  const [yStr, mStr] = ym.split('-');
  const y = Number(yStr);
  const m = Number(mStr); // 1..12
  const daysInMonth = new Date(y, m, 0).getDate(); // local calc, safe once y/m fixed
  const mm = String(m).padStart(2, '0');
  const dd = String(daysInMonth).padStart(2, '0');
  return {
    start_at: `${y}-${mm}-01`,
    end_at:   `${y}-${mm}-${dd}`,
  };
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
      <div className="rounded-2xl border border-[#CBD5E1] bg-gradient-to-br from-[#E5E7EB] to-white p-5 shadow-sm text-center">
        <div className="text-3xl">🥈</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-[#0F172A]/70">Second</div>
        <div className="mt-1 text-lg font-semibold text-[#0F172A] truncate">{two?.username ?? '—'}</div>
        <div className="mt-1 text-[#0F172A]/80">{fmtUSD(Number(two?.totalWager || 0))}</div>
      </div>
      {/* 1st */}
      <div className="rounded-2xl border-2 border-[#F59E0B] bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#FEF3C7] p-6 shadow-md text-center md:-mt-4">
        <div className="text-4xl">👑</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-black/70">Champion</div>
        <div className="mt-1 text-xl font-extrabold text-[#111827] truncate">{one?.username ?? '—'}</div>
        <div className="mt-1 font-semibold text-[#111827]">{fmtUSD(Number(one?.totalWager || 0))}</div>
      </div>
      {/* 3rd */}
      <div className="rounded-2xl border border-[#FDBA74] bg-gradient-to-br from-[#FDBA74] to-white p-5 shadow-sm text-center">
        <div className="text-3xl">🥉</div>
        <div className="mt-2 text-xs uppercase tracking-wide text-[#0F172A]/70">Third</div>
        <div className="mt-1 text-lg font-semibold text-[#0F172A] truncate">{three?.username ?? '—'}</div>
        <div className="mt-1 text-[#0F172A]/80">{fmtUSD(Number(three?.totalWager || 0))}</div>
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

  // last 6 months for dropdown
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

  // FETCH — exact month selected (no shifting), cache-busted, clean braces
  useEffect(() => {
    const { start_at, end_at } = monthRangeFromKeyET(selectedMonth);
    const url = `/api/leaderboard?start_at=${start_at}&end_at=${end_at}&_=${Date.now()}`;

    let cancel = false;

    (async () => {
      setLoading(true);
      setErr('');
      setEntries([]); // clear immediately to avoid mixed rows
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

    return () => {
      cancel = true;
    };
  }, [selectedMonth]);

  // derived data
  const filtered = useMemo(() => {
    const rows = (entries || []).slice().sort((a, b) => Number(b.totalWager || 0) - Number(a.totalWager || 0));
    const qq = q.trim().toLowerCase();
    const searched = qq ? rows.filter(r => (r.username || '').toLowerCase().includes(qq)) : rows;
    return { top10: searched.slice(0, 10), all: searched };
  }, [entries, q]);

  const podium = filtered.top10.slice(0, 3);
  const afterPodium = filtered.top10.slice(3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E0F2FE] via-white to-white text-[#0F172A]">
      {/* HERO / NAV */}
      <header className="bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white shadow">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Monthly Wager Race</h1>
              <p className="text-sm text-white/85 mt-1">
                Play under code <span className="font-semibold">{REF_CODE}</span> to enter
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm">
            <a href="#top10" className="hover:underline">Top 10</a>
            <a href="#how" className="hover:underline">How to Join</a>
            <a href="#prizes" className="hover:underline">Prizes</a>
            <a href="#fair" className="hover:underline">Fair Play</a>
            <a href="#contact" className="hover:underline">Contact</a>
          </nav>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-[#38BDF8] via-[#0EA5E9] to-[#0284C7]" />
      </header>

      {/* CONTROLS */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players…"
              className="w-full rounded-xl border border-[#93C5FD] bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA]"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border border-[#93C5FD] bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#60A5FA]"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end text-sm text-[#0F172A]/80">
            {loading ? <span className="animate-pulse">Loading…</span> : (
              <span>Last updated {updatedAt || '—'} ET{err && <span className="ml-2 text-yellow-700"> • {err}</span>}</span>
            )}
          </div>
        </div>
      </section>

      {/* PODIUM */}
      <section className="mx-auto max-w-6xl px-4">
        {podium.length > 0 && <Podium top3={podium} />}
      </section>

      {/* TOP 10 TABLE */}
      <main id="top10" className="mx-auto max-w-6xl px-4 mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-[#0F172A]">Top 10</h2>
          <span className="text-sm text-[#0F172A]/70">Showing {filtered.top10.length} / {filtered.all.length} players</span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#93C5FD] bg-white shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-[#E0F2FE]">
              <tr className="text-xs uppercase tracking-wide text-[#0F172A]/80">
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
                  <tr
                    key={(row.uid || row.username) + idx}
                    className="border-t border-[#BAE6FD] hover:bg-[#E0F2FE]/60 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{rank}</td>
                    <td className="px-4 py-3 font-medium text-[#0F172A]">{row.username || 'Player'}</td>
                    <td className="px-4 py-3 font-semibold text-[#0F172A]">{fmtUSD(Number(row.totalWager || 0))}</td>
                    <td className="px-4 py-3 text-[#0F172A]">{prizeForRank(rank)}</td>
                  </tr>
                );
              })}
              {!loading && filtered.top10.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-[#0F172A]/70">No players this month yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Full list */}
        {filtered.all.length > 10 && (
          <details className="mt-4 rounded-2xl border border-[#93C5FD] bg-white p-4 open:shadow-sm">
            <summary className="cursor-pointer select-none font-medium text-[#0F172A]">
              View full leaderboard ({filtered.all.length})
            </summary>
            <div className="mt-3 overflow-hidden rounded-xl border border-[#93C5FD]">
              <table className="w-full text-left">
                <thead className="bg-[#E0F2FE]">
                  <tr className="text-xs uppercase tracking-wide text-[#0F172A]/80">
                    <th className="px-3 py-2">Rank</th>
                    <th className="px-3 py-2">Player</th>
                    <th className="px-3 py-2">Total Wager</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.all.map((row, i) => (
                    <tr key={(row.uid || row.username) + 'all' + i} className="border-t border-[#BAE6FD] hover:bg-[#E0F2FE]/60">
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
        <h2 className="text-lg font-semibold tracking-tight text-[#0F172A] mb-4">How to Join</h2>
        <ol className="grid gap-4 md:grid-cols-3">
          <li className="rounded-2xl border border-[#93C5FD] bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">1️⃣</div>
            <p>Create a casino account with code <span className="font-semibold text-[#0F172A]">{REF_CODE}</span>.</p>
          </li>
          <li className="rounded-2xl border border-[#93C5FD] bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">2️⃣</div>
            <p>Wager during the month (ET). Every $1 wagered counts toward the leaderboard.</p>
          </li>
          <li className="rounded-2xl border border-[#93C5FD] bg-white p-5 shadow-sm">
            <div className="text-2xl mb-2">3️⃣</div>
            <p>Finish top 10 to win prizes. Winners announced within 48 hours after month end.</p>
          </li>
        </ol>
        <a
          href="https://YOUR-CASINO-REF-LINK"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 transition"
          target="_blank"
          rel="noreferrer"
        >
          Join with {REF_CODE}
        </a>
      </section>

      {/* Prizes & Payouts */}
      <section id="prizes" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight text-[#0F172A] mb-4">Prizes & Payouts</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {[1,2,3,4,5,6,7,8,9,10].map(r => (
            <div key={r} className="rounded-2xl border border-[#93C5FD] bg-white p-4 shadow-sm flex items-center justify-between">
              <span className="font-medium text-[#0F172A]">Place {r}</span>
              <span className="text-[#0F172A]">{prizeForRank(r)}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[#0F172A]/70 mt-3">
          Payouts are typically via site bonus or direct payment depending on availability. Identification may be required.
        </p>
      </section>

      {/* Fair Play */}
      <section id="fair" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-lg font-semibold tracking-tight text-[#0F172A] mb-4">Fair Play Rules</h2>
        <ul className="space-y-2 text-sm text-[#0F172A]">
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
            <div className="text-lg font-bold text-[#0F172A]">ImSquanto Gaming LLC</div>
            <p className="text-sm text-[#0F172A]/80 mt-1">
              Community tournaments & monthly wager races. Must be of legal age in your jurisdiction.
            </p>
            <p className="text-xs text-[#0F172A]/70 mt-2">
              Gamble responsibly. If you or someone you know has a gambling problem and wants help, call the National Problem Gambling Helpline at 1-800-522-4700 or visit{' '}
              <a className="underline" href="https://www.ncpgambling.org" target="_blank" rel="noreferrer">ncpgambling.org</a>.
            </p>
          </div>
          <div>
            <div className="font-semibold text-[#0F172A] mb-2">Links</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline text-[#0F172A]" href="/terms">Terms</a></li>
              <li><a className="hover:underline text-[#0F172A]" href="/privacy">Privacy</a></li>
              <li><a className="hover:underline text-[#0F172A]" href="/responsible-gaming">Responsible Gaming</a></li>
              <li><a className="hover:underline text-[#0F172A]" href="mailto:contact@squantogaming.com">Contact</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-[#0F172A] mb-2">Social</div>
            <ul className="space-y-1 text-sm">
              <li><a className="hover:underline text-[#0F172A]" href="https://discord.gg/YOURCODE" target="_blank" rel="noreferrer">Discord</a></li>
              <li><a className="hover:underline text-[#0F172A]" href="https://twitch.tv/YOURHANDLE" target="_blank" rel="noreferrer">Twitch</a></li>
              <li><a className="hover:underline text-[#0F172A]" href="https://x.com/YOURHANDLE" target="_blank" rel="noreferrer">X / Twitter</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-[#0F172A]/70">
          © 2025 ImSquanto Gaming LLC — All rights reserved.
        </div>
      </footer>
    </div>
  );
}
