import { NextResponse } from 'next/server';

// Make this route always dynamic + uncached on Vercel/Next
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// helper: convert "YYYY-MM-DD" to "YYYY-MM-DDT12:00:00-05:00" (12:00 PM EST)
function toNoonEST(dateStr: string) {
  // User explicitly wants EST noon (fixed -05:00), not daylight rules.
  return `${dateStr}T12:00:00-05:00`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const startAt = searchParams.get('start_at') ?? '';
  const endAt   = searchParams.get('end_at') ?? '';

  const refCode = process.env.NEXT_PUBLIC_STREAM_REF_CODE;
  const apiKey  = process.env.RAINBET_API_KEY;
  const upstreamBase = process.env.LEADERBOARD_API_URL; // e.g. https://api.rainbet.com/leaderboard

  if (!apiKey)  return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  if (!refCode) return NextResponse.json({ error: 'Missing referral code' }, { status: 500 });
  if (!upstreamBase) return NextResponse.json({ error: 'Missing LEADERBOARD_API_URL' }, { status: 500 });
  if (!startAt || !endAt) return NextResponse.json({ error: 'Missing start_at or end_at' }, { status: 400 });

  // Apply the 12:00 PM EST cut-off window
  const startIso = toNoonEST(startAt); // inclusive
  const endIso   = toNoonEST(endAt);   // inclusive upper bound at noon

  // Build upstream URL
  const upstreamUrl = new URL(upstreamBase);
  // Common param names; adjust if your provider uses different ones
  upstreamUrl.searchParams.set('code', refCode);
  upstreamUrl.searchParams.set('start_at', startIso);
  upstreamUrl.searchParams.set('end_at', endIso);

  // Optional: extra cache-bust
  upstreamUrl.searchParams.set('_', Date.now().toString());

  // Call provider with no-store and auth header
  const res = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,  // change to 'X-API-Key' if required
      'Accept': 'application/json',
      'Cache-Control': 'no-store',
    },
    cache: 'no-store',
    // next: { revalidate: 0 } // if you’re on an older Next, this also helps
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return NextResponse.json(
      { error: 'Upstream error', status: res.status, detail: text.slice(0, 600) },
      { status: res.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const raw = await res.json().catch(() => ({} as any));

  // Normalize to { entries: [...] }
  const entries = Array.isArray(raw?.entries) ? raw.entries
                : Array.isArray(raw?.data)    ? raw.data
                : Array.isArray(raw)          ? raw
                : [];

  const normalized = entries.map((e: any) => ({
    uid: e.uid ?? e.id ?? e.user_id ?? '',
    username: e.username ?? e.name ?? 'Player',
    totalWager: Number(e.totalWager ?? e.wager ?? 0),
    avatar: e.avatar ?? undefined,
  }));

  return NextResponse.json(
    { entries: normalized, range: { start_at: startIso, end_at: endIso } },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}
