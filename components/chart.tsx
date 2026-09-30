import { Sparkline } from "./sparkline";

export function AttentionChart({ data, title }: { data: number[]; title: string }) {
  const max = Math.max(...data);
  return (
    <section className="chartPanel">
      <div className="panelHeader">
        <h2>{title}</h2>
        <span className="liveDot">Live</span>
      </div>
      <div className="barChart">
        {data.map((value, index) => (
          <span key={`${value}-${index}`} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
        ))}
      </div>
      <Sparkline data={data} width={680} height={72} tone="cyan" />
    </section>
  );
}
