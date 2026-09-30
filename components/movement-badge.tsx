import { movementClass } from "@/lib/momentum";

export function MovementBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const sign = value > 0 ? "+" : "";
  return <span className={`movement ${movementClass(value)}`}>{sign}{value}{suffix}</span>;
}
