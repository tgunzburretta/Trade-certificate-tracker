import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Link previews build absolute URLs from this. Without it Next falls back to
  // localhost, so a shared compliance card previews with broken image links.
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Vetted — certificate renewal tracker for trades",
  description:
    "Track public liability, CSCS cards, van MOTs, ladder inspections and DBS checks in one place. Get alerted at 60/30/7 days before they lapse.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
