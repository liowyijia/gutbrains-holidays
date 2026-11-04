import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Holiday Season 2026 / 2027 — Gut-Brain Neurobiology",
  description: "Holiday schedule for the Laboratory of Gut-Brain Neurobiology, Duke University.",
  icons: {
    icon: "/favicon.svg?v=3",
    shortcut: "/favicon.svg?v=3",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
