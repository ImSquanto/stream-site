import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.RAINBET_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 500 });
  }

  const res = await fetch(`https://api.rainbet.com/leaderboard?code=${process.env.NEXT_PUBLIC_STREAM_REF_CODE}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}

