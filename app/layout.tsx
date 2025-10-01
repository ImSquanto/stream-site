export const metadata = {
  title: "Monthly Wager Race",
  description: "Leaderboard for stream community",
};

import "./globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
