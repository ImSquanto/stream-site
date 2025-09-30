import { NextResponse } from 'next/server';

export async function GET() {
  // 🔒 TEST WINDOW (what you asked): Sep 10 → Sep 30, 2025
  const start_at = '2025-09-10';
  const end_at   = '2025-09-30';

  const apiKey = process.env.RAINBET_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Missing RAINBET_API_KEY' }, { status: 500 });

  const url = new URL('https://services.rainbet.com/v1/external/affiliates');
  url.searchParams.set('start_at', start_at);
  url.searchParams.set('end_at', end_at);
  url.searchParams.set('key', apiKey); // ← key in querystring (like your Discord bot)

  const res = await fetch(url.toString(), { cache: 'no-store' });
  const text = await res.text().catch(() => '');

  // Return raw info so we can SEE exactly what Rainbet sends back
  // (Don’t log the URL because it contains your key)
  if (!res.ok) {
    return NextResponse.json({
      ok: false,
      status: res.status,
      start_at, end_at,
      raw: text.slice(0, 1000),
      hint: 'If status is 200 but affiliates empty, there may be no wagers in this window or your key is wrong.',
    }, { status: 200 });
  }

  let json: any = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }

  const players = Array.isArray(json?.affiliates) ? json.affiliates : [];
  const entries = players
    .map((p: any) => ({
      uid: p.id ?? p.uid ?? '',
      username: p.username ?? 'Player',
      totalWager: parseFloat(p.wagered_amount ?? 0),
    }))
    .sort((a, b) => b.totalWager - a.totalWager);

  return NextResponse.json({
    ok: true,
    start_at, end_at,
    count: entries.length,
    sample: entries.slice(0, 3), // show first 3 for sanity
    // ⚠ keep raw hidden now that we parsed it, but show keys:
    shape: Array.isArray(json?.affiliates) ? 'affiliates[]' : Object.keys(json || {}),
  });
}
