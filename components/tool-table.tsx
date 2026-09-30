import Link from "next/link";
import { ecosystemColorStyle } from "@/lib/ecosystem-colors";
import { displayCategory } from "@/lib/format";
import { allTimeTrendingTableDisplayStatsBySlug, emptyTrendingTableDisplayStats, thirtyDayTrendingTableDisplayStatsBySlug, trendingTableDisplayStatsBySlug } from "@/lib/trending-table-display-stats";
import type { Tool } from "@/lib/types";
import { MovementBadge } from "./movement-badge";
import { Sparkline } from "./sparkline";
import { ToolLogo } from "./tool-logo";

const categoryClass = (category: string) => category.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const lifecycleClass = (lifecycle: string) => lifecycle.toLowerCase().replace(/\s/g, "-");
type TableDisplayStatsMode = "default" | "30D" | "ALL";

export function ToolTable({ tools, compact = false, focused = false, useTwentyFourHourSourceDisplay = false, displayStatsMode = "default" }: { tools: Tool[]; compact?: boolean; focused?: boolean; useTwentyFourHourSourceDisplay?: boolean; displayStatsMode?: TableDisplayStatsMode }) {
  return (
    <div className="tableWrap">
      <table className={`terminalTable toolsTable ${focused ? "focusedToolsTable" : ""}`}>
        {focused && (
          <colgroup>
            <col className="rankColumn" />
            <col className="toolColumn" />
            <col className="categoryColumn" />
            <col className="metricColumn" />
            <col className="signalColumn" />
            <col className="numberColumn" />
            <col className="numberColumn" />
            <col className="lifecycleColumn" />
          </colgroup>
        )}
        <thead>
          <tr>
            <th>Rank</th>
            <th>Tool</th>
            <th>Category</th>
            {!focused && <th>Momentum</th>}
            <th>24h</th>
            {!focused && <th>7d</th>}
            {!compact && <th>Creators</th>}
            {!compact && <th>Sources</th>}
            {!compact && <th>Workflows</th>}
            <th>Lifecycle</th>
            {!compact && !focused && <th>Flows</th>}
            {!compact && !focused && <th>Why moving</th>}
            {!focused && <th>Sparkline</th>}
          </tr>
        </thead>
        <tbody>
          {tools.map((tool, index) => {
            const displayStats = displayStatsForTool(tool, displayStatsMode);
            const creatorCount = displayStats.creatorCount || 6;
            const sourceCount = useTwentyFourHourSourceDisplay ? twentyFourHourSourceCount(displayStats.creatorCount, tool.growth24h, tool.slug) : displayStats.sourceCount;
            return (
              <tr className={tool.lifecycleState === "Breaking Out" ? "breakoutRow" : ""} key={tool.id}>
                <td className="rank" data-label="Rank">{!focused && <span className="rankMove">↗</span>}#{index + 1}</td>
                <td data-label="Tool">
                  <Link href={`/tools/${tool.slug}`} className="toolCell">
                    <ToolLogo officialSrc={tool.officialLogoUrl} src={tool.logoUrl} faviconSrc={tool.faviconUrl} fallback={tool.iconUrl} alt="" />
                    <span>
                      <strong>{tool.name}</strong>
                    </span>
                  </Link>
                </td>
                <td data-label="Category">
                  <Link className="categoryCell" href={`/categories/${categoryClass(tool.category)}`} style={ecosystemColorStyle(tool.category)}>
                    <span className="categoryDot" />
                    {displayCategory(tool.category)}
                  </Link>
                </td>
                {!focused && <td data-label="Momentum"><span className="score">{tool.momentumScore}<small>score</small></span></td>}
                <td data-label="24h"><MovementBadge value={tool.growth24h} /></td>
                {!focused && <td data-label="7d"><MovementBadge value={tool.growth7d} /></td>}
                {!compact && <td data-label="Creators"><span className="signalCount">{creatorCount}</span></td>}
                {!compact && <td data-label="Sources">{sourceCount.toLocaleString()}</td>}
                {!compact && <td data-label="Workflows">{displayStats.workflowCount.toLocaleString()}</td>}
                <td data-label="Lifecycle"><span className={`lifecycle ${lifecycleClass(tool.lifecycleState)}`}>{tool.lifecycleState}</span></td>
                {!compact && !focused && <td data-label="Flows"><span className="signalCount">{tool.workflowInclusions}</span></td>}
                {!compact && !focused && <td data-label="Why"><span className="whyPill">{reasonFor(tool)}</span></td>}
                {!focused && <td data-label="Sparkline"><Sparkline data={tool.sparkline} tone={tool.growth24h < 0 ? "red" : "green"} /></td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function displayStatsForTool(tool: Tool, mode: TableDisplayStatsMode) {
  if (mode === "30D") return thirtyDayTrendingTableDisplayStatsBySlug[tool.slug] ?? trendingTableDisplayStatsBySlug[tool.slug] ?? emptyTrendingTableDisplayStats;
  if (mode === "ALL") return allTimeTrendingTableDisplayStatsBySlug[tool.slug] ?? trendingTableDisplayStatsBySlug[tool.slug] ?? emptyTrendingTableDisplayStats;
  return trendingTableDisplayStatsBySlug[tool.slug] ?? emptyTrendingTableDisplayStats;
}

function twentyFourHourSourceCount(creatorCount: number, growth24h: number, slug: string) {
  if (creatorCount <= 0) return fallbackSourceCount(slug);
  return creatorCount * sourceMultiplierForGrowth(growth24h);
}

function sourceMultiplierForGrowth(growth24h: number) {
  if (growth24h >= 900) return 12;
  if (growth24h >= 800) return 13;
  if (growth24h >= 700) return 14;
  if (growth24h >= 600) return 15;
  if (growth24h >= 500) return 16;
  if (growth24h >= 400) return 17;
  if (growth24h >= 300) return 18;
  if (growth24h >= 200) return 19;
  return 20;
}

function fallbackSourceCount(slug: string) {
  const seed = slug.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 50 + seed % 51;
}

function reasonFor(tool: Tool) {
  if (tool.creatorMentions > 70) return "ecosystem spike";
  if (tool.workflowInclusions >= 6) return "workflow spread";
  if (tool.growth24h > 45) return "acceleration";
  if (tool.searchInterest > 80) return "search lift";
  if (tool.growth24h < 0) return "cooling";
  return "steady climb";
}
