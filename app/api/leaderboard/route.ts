import { NextResponse } from 'next/server';

// Defaults to current month in ET, but lets you override with ?start_at=YYYY-MM-DD&end_at=YYYY-MM-DD
function monthRangeET(d = new Date()) {
  const fmt = (x: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(x); // YYYY-MM-DD
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const next  = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const last  = new Date(next.getTime() - 24 * 60 * 60 * 1000);
  return { start: fmt(first), end: fmt(last) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const { start, end } = monthRangeET();
  const start_at = searchParams.get('start_at') || start;
  const end_at   = searchParams.get('end_at')   || end;

  const apiKey = process.env.RAINBET_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing RAINBET_API_KEY' }, { status: 500 });

  const url = new URL('https://services.rainbet.com/v1/external/affiliates');
  url.searchParams.set('start_at', start_at);
  url.searchParams.set('end_at',   end_at);
  url.searchParams.set('key',      apiKey); // key goes in querystring

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'Upstream error', status: res.status, detail: text.slice(0, 500) },
      { status: res.status }
    );
  }

  const data = await res.json();
  const players = Array.isArray(data?.affiliates) ? data.affiliates : [];

  const entries = players
    .map((p: any) => ({
      uid: p.id ?? p.uid ?? '',
      username: p.username ?? 'Player',
      totalWager: parseFloat(p.wagered_amount ?? 0),
    }))
    .sort((a, b) => b.totalWager - a.totalWager);

  return NextResponse.json({ entries, range: { start_at, end_at } });
}
