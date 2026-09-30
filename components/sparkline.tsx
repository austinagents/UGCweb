type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  tone?: "green" | "red" | "cyan";
};

export function Sparkline({ data, width = 116, height = 34, tone = "green" }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = Math.max(max - min, 1);
  const points = data.map((value, index) => {
    const x = (index / Math.max(data.length - 1, 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const stroke = tone === "red" ? "var(--red)" : tone === "cyan" ? "var(--cyan)" : "var(--green)";

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="momentum sparkline">
      <polyline fill="none" stroke={stroke} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
