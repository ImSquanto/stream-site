import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  // ✅ HARD-CODED test window: Sep 10 → Sep 30, 2025
  const start_at = '2025-09-10';
  const end_at   = '2025-09-30';

  const apiKey = process.env.RAINBET_API_KEY; // set in Vercel (Production)
  if (!apiKey) return NextResponse.json({ error: 'Missing RAINBET_API_KEY' }, { status: 500 });

  // This is the Rainbet endpoint your bot used
  const url = new URL('https://services.rainbet.com/v1/external/affiliates');
  url.searchParams.set('start_at', start_at);
  url.searchParams.set('end_at', end_at);
  url.searchParams.set('key', apiKey); // key in query string

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: 'Upstream error', status: res.status, detail: text.slice(0, 500) }, { status: res.status });
  }

  const data = await res.json();

  // Expecting Rainbet to return { affiliates: [...] } with wagered_amount per user
  const rows = Array.isArray(data?.affiliates) ? data.affiliates : [];
  const sorted = rows.sort(
    (a: any, b: any) => parseFloat(b.wagered_amount || 0) - parseFloat(a.wagered_amount || 0)
  );

  const entries = sorted.map((p: any, i: number) => ({
    uid: p.id ?? p.uid ?? '',
    username: p.username ?? 'Player',
    totalWager: parseFloat(p.wagered_amount ?? 0),
    rank: i + 1,
  }));

  return NextResponse.json({ entries, range: { start_at, end_at } });
}
