import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g. "2025-09"

  const refCode = process.env.NEXT_PUBLIC_STREAM_REF_CODE; // public is OK
  const apiKey = process.env.RAINBET_API_KEY;             // server only

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }
  if (!refCode) {
    return NextResponse.json({ error: 'Missing referral code' }, { status: 500 });
  }

  // 🔧 Change this to match the real RainBet leaderboard endpoint
  const upstreamUrl = new URL('https://api.rainbet.com/leaderboard');
  upstreamUrl.searchParams.set('code', refCode);
  if (month) upstreamUrl.searchParams.set('month', month);

  const res = await fetch(upstreamUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // <-- if RainBet wants X-API-Key instead, change here
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'Upstream error', status: res.status, detail: text.slice(0, 500) },
      { status: res.status }
    );
  }

  const data = await res.json();

  // Normalize the response to { entries: [...] }
  const entries = Array.isArray(data?.entries)
    ? data.entries
    : Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
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

