import type { Metadata } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/app-shell";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900"
});

export const metadata: Metadata = {
  title: "PartnerLinks",
  description: "TikTok Shop intelligence, marketplace, and brand partnerships."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={geistSans.variable}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
