import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@capitech/ui";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://capitech.me"),
  title: {
    default: "Capitech Bank — Banking beyond borders",
    template: "%s | Capitech Bank",
  },
  description:
    "Capitech Bank is a full-fledged digital bank offering multi-currency accounts, virtual cards, term deposits, crypto and open APIs for individuals and businesses.",
  keywords: ["digital bank", "multi-currency", "virtual cards", "term deposits", "crypto", "open banking"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://capitech.me",
    siteName: "Capitech Bank",
    title: "Capitech Bank — Banking beyond borders",
    description:
      "Multi-currency accounts, virtual cards, term deposits, crypto and open APIs. Personal & business banking for the digital era.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capitech Bank — Banking beyond borders",
    description: "Multi-currency accounts, virtual cards, term deposits, crypto and open APIs.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
