import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // Input from the frontend (YYYY-MM-DD)
  const startAt = searchParams.get('start_at') ?? '';
  const endAt   = searchParams.get('end_at') ?? '';
  const debug   = searchParams.get('debug') === '1';

  // Env you set in Vercel
  const refCode = process.env.NEXT_PUBLIC_STREAM_REF_CODE;
  const apiKey  = process.env.RAINBET_API_KEY;
  const upstreamBase = process.env.LEADERBOARD_API_URL; // e.g. https://YOUR-API/leaderboard

  if (!apiKey)        return NextResponse.json({ error: 'Missing API key (RAINBET_API_KEY)' }, { status: 500 });
  if (!refCode)       return NextResponse.json({ error: 'Missing referral code (NEXT_PUBLIC_STREAM_REF_CODE)' }, { status: 500 });
  if (!upstreamBase)  return NextResponse.json({ error: 'Missing LEADERBOARD_API_URL' }, { status: 500 });
  if (!startAt || !endAt)
    return NextResponse.json({ error: 'Missing start_at or end_at' }, { status: 400 });

  // Build upstream URL EXACTLY with date strings (no time-of-day)
  const upstreamUrl = new URL(upstreamBase);
  // ⚠️ If your provider uses different names, change here:
  upstreamUrl.searchParams.set('code', refCode);
  upstreamUrl.searchParams.set('start_at', startAt);
  upstreamUrl.searchParams.set('end_at', endAt);
  // Cache-bust upstream just in case
  upstreamUrl.searchParams.set('_', Date.now().toString());

  const upstreamReq = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`, // switch to 'X-API-Key' if your docs say so
      'Accept': 'application/json',
      'Cache-Control': 'no-store',
    },
    cache: 'no-store',
  });

  const textBody = await upstreamReq.text().catch(() => '');
  let raw: any = {};
  try { raw = textBody ? JSON.parse(textBody) : {}; } catch { raw = {}; }

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

  // Optional debug echo (shows what we called upstream with)
  if (debug) {
    return NextResponse.json({
      debug: {
        upstream: upstreamUrl.toString(),
        status: upstreamReq.status,
        rawPreview: typeof raw === 'object' ? Object.keys(raw) : String(textBody).slice(0, 200),
        count: normalized.length,
        range: { start_at: startAt, end_at: endAt },
      },
      entries: normalized,
    }, { headers: { 'Cache-Control': 'no-store' }});
  }

  return NextResponse.json(
    { entries: normalized, range: { start_at: startAt, end_at: endAt } },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}
