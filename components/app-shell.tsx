"use client";

import { Bookmark, Grid2X2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LOCAL_CREATORS_KEY, LOCAL_PRODUCTS_KEY } from "@/lib/local-graph";
import { SignupDialog } from "./signup-dialog";
import { CommandSearch } from "./command-search";

const tabs = [
  { href: "https://discord.gg/RbWjMUdFte", label: "Discord", icon: DiscordMark, className: "discordNavTab", external: true },
  { href: "/heatmap", label: "Heatmap", icon: Grid2X2 },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark }
];

export function AppShell({ children }: { children: ReactNode }) {
  const hasProfile = useHasLocalProfile();
  usePrimaryNavigationPrefetch();

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="AppScreener home">
          <span className="brandMark"><Image src="/logo.png" alt="" width={36} height={36} priority unoptimized /></span>
          <span>
            <strong>PartnerLinks</strong>
            <small>BY UGC NETWORK</small>
          </span>
        </Link>
        <CommandSearch />
        <nav className="navTabs">
          {tabs.map((tab) => tab.href && tab.icon ? (
            <Link className={tab.className} href={tab.href} key={tab.href} target={("external" in tab && tab.external) ? "_blank" : undefined} rel={("external" in tab && tab.external) ? "noreferrer" : undefined}>
              <tab.icon size={15} />
              {tab.label}
            </Link>
          ) : <span className={tab.className} aria-disabled="true" key={tab.label}>{tab.label}</span>)}
          {hasProfile ? (
            <Link href="/dashboard">
              <UserRound size={15} />
              Profile
            </Link>
          ) : (
            <SignupDialog />
          )}
        </nav>
      </header>
      <main className="pageShell">{children}</main>
    </>
  );
}

function usePrimaryNavigationPrefetch() {
  const router = useRouter();
  useEffect(() => {
    const prefetch = () => {
      for (const route of ["/", "/marketplace", "/heatmap", "/watchlist", "/search"]) router.prefetch(route);
    };
    if (typeof window.requestIdleCallback === "function" && typeof window.cancelIdleCallback === "function") {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(prefetch, 500);
    return () => window.clearTimeout(timeoutId);
  }, [router]);
}

function DiscordMark({ size = 15 }: { size?: number }) {
  return (
    <svg className="discordMark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M19.54 5.34A17.3 17.3 0 0 0 15.29 4l-.52 1.06a16.2 16.2 0 0 0-5.54 0L8.71 4a17.4 17.4 0 0 0-4.26 1.34C1.76 9.33 1.03 13.22 1.4 17.06a17.1 17.1 0 0 0 5.22 2.63l1.27-1.74a11 11 0 0 1-2-.96l.5-.39c3.88 1.8 8.1 1.8 11.93 0l.51.39a12 12 0 0 1-2 .96l1.27 1.74a17 17 0 0 0 5.21-2.63c.44-4.45-.75-8.3-3.77-11.72ZM8.52 14.71c-1.17 0-2.13-1.08-2.13-2.4 0-1.33.94-2.41 2.13-2.41s2.15 1.09 2.13 2.41c0 1.32-.94 2.4-2.13 2.4Zm6.96 0c-1.17 0-2.13-1.08-2.13-2.4 0-1.33.94-2.41 2.13-2.41s2.15 1.09 2.13 2.41c0 1.32-.94 2.4-2.13 2.4Z" />
    </svg>
  );
}

function useHasLocalProfile() {
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const updateProfileState = () => {
      setHasProfile(hasStoredRecords(LOCAL_PRODUCTS_KEY) || hasStoredRecords(LOCAL_CREATORS_KEY));
    };

    updateProfileState();
    window.addEventListener("storage", updateProfileState);
    window.addEventListener("appscreener:profile-updated", updateProfileState);
    return () => {
      window.removeEventListener("storage", updateProfileState);
      window.removeEventListener("appscreener:profile-updated", updateProfileState);
    };
  }, []);

  return hasProfile;
}

function hasStoredRecords(key: string) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
