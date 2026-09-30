"use client";

import { Activity, Bookmark, Grid2X2, Palette, UserPlus, UserRound, Workflow } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LOCAL_CREATORS_KEY, LOCAL_PRODUCTS_KEY } from "@/lib/local-graph";
import { CommandSearch } from "./command-search";

const tabs = [
  { href: "/search", label: "Discover", icon: Activity },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/creators", label: "Creators", icon: Palette },
  { href: "/heatmap", label: "Heatmap", icon: Grid2X2 },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark }
];

export function AppShell({ children }: { children: ReactNode }) {
  const hasProfile = useHasLocalProfile();

  return (
    <>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="AppScreener home">
          <span className="brandMark"><Image src="/logo.png" alt="" width={36} height={36} priority /></span>
          <span>
            <strong>AppScreener</strong>
            <small>The live screener for AI products.</small>
          </span>
        </Link>
        <CommandSearch />
        <nav className="navTabs">
          {tabs.map((tab) => (
            <Link href={tab.href} key={tab.href}>
              <tab.icon size={15} />
              {tab.label}
            </Link>
          ))}
          <Link href="/dashboard">
            {hasProfile ? <UserRound size={15} /> : <UserPlus size={15} />}
            {hasProfile ? "Profile" : "Sign Up"}
          </Link>
        </nav>
      </header>
      <main className="pageShell">{children}</main>
    </>
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
