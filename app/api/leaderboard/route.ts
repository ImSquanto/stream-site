import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // "2025-09" etc.

  const refCode = process.env.NEXT_PUBLIC_STREAM_REF_CODE;
  const apiKey  = process.env.RAINBET_API_KEY;

  if (!apiKey)  return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  if (!refCode) return NextResponse.json({ error: 'Missing referral code' }, { status: 500 });

  // 🔧 CHANGE THIS to the real leaderboard endpoint:
  const upstreamUrl = new URL('https://YOUR-PROVIDER.com/leaderboard'); // e.g., https://api.rainbet.com/leaderboard
  upstreamUrl.searchParams.set('code', refCode);
  if (month) upstreamUrl.searchParams.set('month', month);

  const res = await fetch(upstreamUrl.toString(), {
    headers: {
      // Pick ONE that matches your docs:
      'Authorization': `Bearer ${apiKey}`,  // common
      // 'X-API-Key': apiKey,               // if docs say X-API-Key
      // 'Authorization': `Token ${apiKey}`,// sometimes "Token"
      'Accept': 'application/json',
    },
    // cache: 'no-store', // uncomment to force fresh data
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json({ error: 'Upstream error', status: res.status, detail: text.slice(0, 500) }, { status: res.status });
  }

  const raw = await res.json();

  // Normalize to { entries: [...] } for the frontend
  const entries = Array.isArray(raw?.entries) ? raw.entries
                : Array.isArray(raw?.data)    ? raw.data
                : Array.isArray(raw)          ? raw
                : [];
  const normalized = entries.map((e: any) => ({
    uid: e.uid ?? e.id ?? e.user_id ?? '',
    username: e.username ?? e.name ?? 'Player',
    totalWager: Number(e.totalWager ?? e.wager ?? 0),
    month: e.month ?? e.monthKey ?? month ?? undefined,
    avatar: e.avatar ?? undefined,
  }));

  return NextResponse.json({ entries: normalized });
}

