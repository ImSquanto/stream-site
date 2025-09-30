import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // You can control date range if Rainbet requires it
  const start = searchParams.get('start_at') || new Date().toISOString().slice(0, 10);
  const end = searchParams.get('end_at') || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10);

  const apiKey = process.env.RAINBET_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing RAINBET_API_KEY' }, { status: 500 });
  }

  // This is the Rainbet endpoint your bot was using
  const url = new URL('https://services.rainbet.com/v1/external/affiliates');
  url.searchParams.set('start_at', start);
  url.searchParams.set('end_at', end);
  url.searchParams.set('key', apiKey);

  const res = await fetch(url.toString(), { cache: 'no-store' });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: 'Upstream error', status: res.status, detail: text.slice(0, 500) }, { status: res.status });
  }

  const data = await res.json();

  // Your bot showed affiliate wagers in data.affiliates
  const players = Array.isArray(data?.affiliates) ? data.affiliates : [];
  const sorted = players.sort((a: any, b: any) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
  const normalized = sorted.map((p: any, i: number) => ({
    uid: p.id ?? p.uid ?? '',
    username: p.username ?? 'Player',
    totalWager: parseFloat(p.wagered_amount ?? 0),
    rank: i + 1,
  }));

  return NextResponse.json({ entries: normalized });
}

