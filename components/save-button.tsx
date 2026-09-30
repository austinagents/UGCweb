"use client";

import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";

type Kind = "tools" | "workflows" | "categories";

export function SaveButton({ kind, id, label = "Save" }: { kind: Kind; id: string; label?: string }) {
  const key = `appscreener:${kind}`;
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const items = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    setSaved(items.includes(id));
  }, [id, key]);

  function toggle() {
    const items = JSON.parse(localStorage.getItem(key) || "[]") as string[];
    const next = items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    localStorage.setItem(key, JSON.stringify(next));
    setSaved(next.includes(id));
    window.dispatchEvent(new Event("appscreener-watchlist"));
  }

  return (
    <button className={`iconTextButton ${saved ? "saved" : ""}`} onClick={toggle} type="button">
      <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : label}
    </button>
  );
}
