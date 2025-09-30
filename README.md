# Stream Site — Monthly Wager Leaderboard

This is a minimal Next.js + Tailwind site ready to deploy on **Vercel**. It shows demo leaderboard data until you connect your API.

## Quick Start (Local)

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Env Vars (set in Vercel → Project → Settings → Environment Variables)

- `NEXT_PUBLIC_STREAM_REF_CODE` — your referral code (e.g., SQUANTO)
- `NEXT_PUBLIC_LEADERBOARD_API_URL` — your JSON endpoint (optional for demo)

## Deploy on Vercel

1. Push this folder to GitHub.
2. On vercel.com → New Project → Import your repo → Deploy.
3. Add env vars and Redeploy.