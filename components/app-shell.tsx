"use client";

import { Bookmark, Grid2X2, Store, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LOCAL_CREATORS_KEY, LOCAL_PRODUCTS_KEY } from "@/lib/local-graph";
import { CommandSearch } from "./command-search";

const tabs = [
  { href: "/marketplace", label: "Marketplace", icon: Store, className: "marketplaceNavTab" },
  { label: "BETA", className: "betaNavTab" },
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
            <strong>PartnerLinks</strong>
            <small>BY UGC NETWORK</small>
          </span>
        </Link>
        <CommandSearch />
        <nav className="navTabs">
          {tabs.map((tab) => tab.href && tab.icon ? (
            <Link className={tab.className} href={tab.href} key={tab.href}>
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
            <span className="googleSignupNavTab" aria-disabled="true">
              <GoogleMark />
              Sign Up
            </span>
          )}
        </nav>
      </header>
      <main className="pageShell">{children}</main>
    </>
  );
}

function GoogleMark() {
  return (
    <svg className="googleMark" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.205c0-.638-.057-1.252-.164-1.841H9v3.482h4.844a4.14 4.14 0 0 1-1.797 2.716v2.258h2.909c1.703-1.568 2.684-3.878 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.468-.806 5.956-2.18l-2.91-2.258c-.805.54-1.835.859-3.046.859-2.344 0-4.328-1.585-5.037-3.714H.956v2.332A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.963 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.281-1.707V4.961H.956A9 9 0 0 0 0 9c0 1.452.347 2.827.956 4.039l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.507.455 3.44 1.346l2.582-2.581C13.464.892 11.426 0 9 0A9 9 0 0 0 .956 4.961l3.007 2.332C4.672 5.165 6.656 3.58 9 3.58Z" />
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
