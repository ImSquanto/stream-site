import { NextResponse } from 'next/server';

// Get first/last day of the current month in America/New_York
function monthRangeET(d = new Date()) {
  // first day 00:00 ET
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  // last day 23:59:59 ET (compute by first of next month minus 1 day)
  const nextMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const last = new Date(nextMonth.getTime() - 24 * 60 * 60 * 1000);

  // Format as YYYY-MM-DD in ET
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })
      .format(x); // en-CA gives YYYY-MM-DD

  return { start: fmt(first), end: fmt(last) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Allow overrides via query, otherwise use ET month range
  const { start, end } = monthRangeET();
  const start_at = searchParams.get('start_at') || start;   // e.g., 2025-09-01
  const end_at   = searchParams.get('end_at')   || end;     // e.g., 2025-09-30

  const apiKey = process.env.RAINBET_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing RAINBET_API_KEY' }, { status: 500 });

  // Rainbet endpoint from your bot
  const url = new URL('https://services.rainbet.com/v1/external/affiliates');
  url.searchParams.set('start_at', start_at);
  url.searchParams.set('end_at', end_at);
  url.searchParams.set('key', apiKey); // key goes in query string

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'Upstream error', status: res.status, detail: text.slice(0, 500) },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Your bot read from data.affiliates and used 'wagered_amount'
  const players = Array.isArray(data?.affiliates) ? data.affiliates : [];
  const sorted = players.sort((a: any, b: any) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
  const normalized = sorted.map((p: any, i: number) => ({
    uid: p.id ?? p.uid ?? '',
    username: p.username ?? 'Player',
    totalWager: parseFloat(p.wagered_amount ?? 0),
    rank: i + 1,
  }));

  return NextResponse.json({ entries: normalized, range: { start_at, end_at } });
}
