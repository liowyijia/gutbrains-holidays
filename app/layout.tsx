import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Calendar — Gut-Brain Neurobiology",
  description: "Shared year-end schedule and lab responsibilities for the Laboratory of Gut-Brain Neurobiology, Duke University.",
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
