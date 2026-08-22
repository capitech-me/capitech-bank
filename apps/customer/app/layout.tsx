import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@capitech/ui";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Capitech Bank", template: "%s | Capitech Bank" },
  description: "Your digital bank — accounts, cards, transfers and deposits.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full">
        {children}
        <Toaster position="top-center" richColors />
        <Analytics />
      </body>
    </html>
  );
}
