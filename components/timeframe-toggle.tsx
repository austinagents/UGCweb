"use client";

const frames = ["1H", "6H", "24H", "7D", "30D"];

export function TimeframeToggle({ compact = false, options = frames, active = "24H", onChange }: { compact?: boolean; options?: string[]; active?: string; onChange?: (frame: string) => void }) {
  return (
    <div className={`timeframeToggle ${compact ? "compact" : ""}`} aria-label="Timeframe selector">
      {options.map((frame) => (
        <button className={frame === active ? "active" : ""} key={frame} onClick={() => onChange?.(frame)} type="button">
          {frame}
        </button>
      ))}
    </div>
  );
}
