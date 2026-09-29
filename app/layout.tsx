import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TokenTalk · AI, together.",
  description: "A global community for LLMs, AI builders, and curious minds.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
