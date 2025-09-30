'use client';

import React, { useEffect, useMemo, useState } from "react";

export const dynamic = "force-static";

// ✅ Configure via Vercel env vars after deploy
const API_URL = process.env.NEXT_PUBLIC_LEADERBOARD_API_URL || "https://YOUR-API/leaderboard";
const REF_CODE = process.env.NEXT_PUBLIC_STREAM_REF_CODE || "YOURCODE";

const formatCurrency = (n: number) => {
  if (n == null || isNaN(n)) return "-";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(+n);
};

const monthKey = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const thisMonthKey = monthKey();

type Row = {
  username: string;
  avatar?: string;
  totalWager: number;
  uid?: string;
  id?: string;
  month?: string;
  monthKey?: string;
  wager?: number;
};

const DEMO: Row[] = [
  { username: "AceHigh", avatar: "", totalWager: 128_400, uid: "u1", month: thisMonthKey },
  { username: "LuckyLynx", avatar: "", totalWager: 102_950, uid: "u2", month: thisMonthKey },
  { username: "RNGsus", avatar: "", totalWager: 88_310, uid: "u3", month: thisMonthKey },
  { username: "ChipStacker", avatar: "", totalWager: 71_420, uid: "u4", month: thisMonthKey },
  { username: "TiltNoMore", avatar: "", totalWager: 55_090, uid: "u5", month: thisMonthKey },
  { username: "RiverKing", avatar: "", totalWager: 41_800, uid: "u6", month: thisMonthKey },
  { username: "HighRollHer", avatar: "", totalWager: 33_260, uid: "u7", month: thisMonthKey },
  { username: "SlotsNSauce", avatar: "", totalWager: 21_700, uid: "u8", month: thisMonthKey },
  { username: "Dicey", avatar: "", totalWager: 11_230, uid: "u9", month: thisMonthKey },
  { username: "PlinkoPapi", avatar: "", totalWager: 9_510, uid: "u10", month: thisMonthKey },
];

const Avatar = ({ name }: { name: string }) => {
  const seed = (name || "?").charCodeAt(0) % 6;
  const emojis = ["🎲", "🧧", "🪙", "🎰", "🃏", "💎"];
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg">
      <span>{emojis[seed]}</span>
    </div>
  );
};

const RankBadge = ({ rank }: { rank: number }) => {
  const styles: Record<number, string> = {
    1: "bg-amber-400 text-black",
    2: "bg-gray-300 text-black",
    3: "bg-orange-400 text-black",
  };
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${styles[rank] || "bg-gray-800 text-white"}`}>
      {rank}
    </span>
  );
};

const prizeForRank = (rank: number) => {
  if (rank === 1) return { label: "1st", prize: "$500 + Shoutout" };
  if (rank === 2) return { label: "2nd", prize: "$250" };
  if (rank === 3) return { label: "3rd", prize: "$100" };
  if (rank <= 10) return { label: `${rank}th`, prize: "$25 Bonus" };
  return { label: `${rank}th`, prize: "—" };
};

export default function Page() {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(thisMonthKey);

  const monthOptions = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push({ key: monthKey(d), label: d.toLocaleString(undefined, { month: "long", year: "numeric" }) });
    }
    return arr;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const url = new URL(API_URL);
        url.searchParams.set("month", selectedMonth);
        url.searchParams.set("ref", REF_CODE);
        const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          const entries = Array.isArray(json?.entries) ? json.entries : json || [];
          setData(entries as Row[]);
        }
      } catch (e: any) {
        console.warn("Leaderboard API failed, using demo data:", e?.message);
        if (!cancelled) setData(DEMO);
        if (!cancelled) setError("Showing demo data — connect your API to go live.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [selectedMonth]);

  const filtered = useMemo(() => {
    const rows = (data || [])
      .filter((r: Row) => !selectedMonth || r.month === selectedMonth || r.monthKey === selectedMonth)
      .map((r: Row) => ({
        ...r,
        username: (r as any).username || (r as any).name || "Player",
        totalWager: Number((r as any).totalWager ?? (r as any).wager ?? 0),
      }))
      .sort((a: Row, b: Row) => b.totalWager - a.totalWager);

    if (!q) return rows;
    const qq = q.toLowerCase();
    return rows.filter((r: Row) => r.username.toLowerCase().includes(qq));
  }, [data, q, selectedMonth]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white text-zinc-900">
      <header className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white/60 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Monthly Wager Race</h1>
              <p className="text-xs md:text-sm text-zinc-600">Play under code <span className="font-semibold">{REF_CODE}</span> to enter</p>
            </div>
          </div>
          <a href="#join" className="rounded-xl border px-3 py-2 text-sm font-medium shadow-sm hover:shadow transition">Join the Race</a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search players…"
              className="w-full rounded-xl border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
            />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-xl border px-3 py-2 shadow-sm"
            >
              {monthOptions.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end text-sm text-zinc-600">
            {loading ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <span>
                Last updated {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {error && <span className="ml-2 text-amber-600">• {error}</span>}
              </span>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-zinc-50">
              <tr className="text-xs uppercase tracking-wide text-zinc-600">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Total Wager</th>
                <th className="px-4 py-3">Prize</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const rank = idx + 1;
                const prize = prizeForRank(rank);
                return (
                  <tr key={row.uid || row.id || row.username} className={`border-t ${rank <= 3 ? "bg-amber-50/50" : "bg-white"}`}>
                    <td className="px-4 py-3"><RankBadge rank={rank} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {row.avatar ? (
                          <img src={row.avatar} alt={row.username} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <Avatar name={row.username} />
                        )}
                        <div className="leading-tight">
                          <div className="font-semibold">{row.username}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[220px]">{row.uid || "id hidden"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(row.totalWager)}</td>
                    <td className="px-4 py-3 text-zinc-700">{prize.prize}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">No players yet this month. Be the first!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border p-4 shadow-sm">
            <h3 className="font-semibold mb-1">How to Join</h3>
            <p className="text-sm text-zinc-600">Create an account with our partner casino and enter code <span className="font-semibold">{REF_CODE}</span> on signup or in the promo field. Wagers placed while the code is active count toward the monthly race.</p>
          </div>
          <div className="rounded-2xl border p-4 shadow-sm">
            <h3 className="font-semibold mb-1">Prizes & Payouts</h3>
            <p className="text-sm text-zinc-600">Top 3 receive the big prizes weekly or monthly based on our posted schedule. Bonuses are credited as cash, site credit, or crypto at our discretion. Void where prohibited. 18+ or 21+ where required.</p>
          </div>
          <div className="rounded-2xl border p-4 shadow-sm">
            <h3 className="font-semibold mb-1">Fair Play</h3>
            <p className="text-sm text-zinc-600">We review accounts for abuse. Alt accounts, self-referrals, and bonus abuse are disqualified. By participating you agree to our terms.</p>
          </div>
        </div>

        <section id="join" className="mt-10 mb-20 rounded-2xl border p-6 shadow-sm bg-gradient-to-br from-zinc-50 to-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Ready to climb the board?</h2>
              <p className="text-sm text-zinc-600">Use code <span className="font-semibold">{REF_CODE}</span> at signup. Your wagers start counting this month.</p>
            </div>
            <a
              href="https://rainbet.com/?r=squanto"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm hover:shadow transition"
            >
              Sign up & Play
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-zinc-500">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p>
              © {new Date().getFullYear()} ImSquanto Gaming LLC — All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:underline">Terms</a>
              <a href="#" className="hover:underline">Privacy</a>
              <a href="#" className="hover:underline">Responsible Gaming</a>
              <a href="#" className="hover:underline">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
