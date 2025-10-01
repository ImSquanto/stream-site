import './globals.css';
import type { Metadata } from 'next';
import { Sora } from 'next/font/google';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });

export const metadata: Metadata = {
  title: 'ImSquanto Wager Race',
  description: 'Monthly wager leaderboard for ImSquanto Gaming',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sora.variable} font-sans bg-[#0B1535] text-white antialiased`}>
        {children}
      </body>
    </html>
  );
}
