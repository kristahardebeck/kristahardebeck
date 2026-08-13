import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schutz Foundation — Fundraising Dashboard",
  description:
    "Live fundraising performance for the Schutz Foundation, with an analyst that reads the underlying donor, campaign and channel data.",
};

// Applied before paint so the page never flashes the wrong theme.
const THEME_INIT = `
try {
  var stored = localStorage.getItem('mh-theme');
  var theme = stored || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
