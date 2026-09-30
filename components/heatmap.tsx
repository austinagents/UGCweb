import Link from "next/link";
import type { CSSProperties } from "react";
import {
  Bot,
  Box,
  BriefcaseBusiness,
  Bug,
  ChartNoAxesCombined,
  CircleDollarSign,
  Code2,
  FileText,
  Globe2,
  Mail,
  Megaphone,
  MousePointer2,
  Pickaxe,
  Search,
  Send,
  Sparkles,
  Tags,
  UserPlus,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { ecosystemColorStyle } from "@/lib/ecosystem-colors";
import { ecosystemTagSlug } from "@/lib/ecosystem-tags";
import { displayCategory } from "@/lib/format";
import type { AttentionSubCategory, Category } from "@/lib/types";
import { MovementBadge } from "./movement-badge";

export function CategoryHeatmap({ categories }: { categories: Category[] }) {
  return (
    <div className="heatmapGrid">
      {categories.map((category) => (
        <Link
          href={`/categories/${category.slug}`}
          className="heatTile"
          key={category.id}
          style={
            {
              "--heat": `${Math.min(category.momentumScore, 90)}%`,
              ...ecosystemColorStyle(category.name),
            } as CSSProperties
          }
        >
          <div className="heatTileTop">
            <span>{displayCategory(category.name)}</span>
            <em>sector rotation</em>
          </div>
          <strong>
            {category.momentumScore}
            <small> score</small>
          </strong>
          <div className="heatTileFlow">
            <MovementBadge value={category.growth24h} />
            <small>
              7d <MovementBadge value={category.growth7d} />
            </small>
          </div>
          <div className="heatIntensity">
            <i
              style={{
                width: `${Math.min(
                  100,
                  category.momentumScore + category.growth24h
                )}%`,
              }}
            />
          </div>
          <small>{category.toolsTracked} tools tracked</small>
        </Link>
      ))}
    </div>
  );
}

export function AttentionHeatmap({ items }: { items: AttentionSubCategory[] }) {
  void items;
  const centerpiece = attentionClusters.find((cluster) => cluster.id === "center");
  const topLeft = attentionClusters.find((cluster) => cluster.id === "markets");
  const topRight = attentionClusters.find((cluster) => cluster.id === "growth");
  const bottomLeft = attentionClusters.find((cluster) => cluster.id === "builders");
  const bottomRight = attentionClusters.find((cluster) => cluster.id === "ops");

  const renderCluster = (cluster: AttentionClusterConfig) => {
    const clusterStyle = {
      "--cluster-color": cluster.color,
    } as CSSProperties;

    return (
      <section className={`attentionCluster ${cluster.id}`} key={cluster.id} style={clusterStyle} aria-label={cluster.title}>
        <div className="attentionClusterLabel">
          <cluster.icon size={14} />
          <span>{cluster.title}</span>
        </div>
        <div className="attentionClusterBody">
          {cluster.tags.map((tag) => (
            <Link className={`attentionNode heatmap-tag-button ${tag.size}`} href={`/tags/${ecosystemTagSlug(tag.label)}`} key={tag.label}>
              <tag.icon size={tag.iconSize ?? 14} />
              <span>{tag.label}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="attentionHeatmapComponent">
      <div className="heatmapCanvasFrame heatmap-container-relative-wrapper" aria-label="Attention pocket pressure map">
        <div className="attentionTaxonomyGrid heatmap-grid-container heatmap-grid-main">
          {topLeft ? renderCluster(topLeft) : null}
          {topRight ? renderCluster(topRight) : null}
          {bottomLeft ? renderCluster(bottomLeft) : null}
          {bottomRight ? renderCluster(bottomRight) : null}
        </div>

        {centerpiece ? (
          <div className="attentionCenterpiece centerpiece-overlay heatmap-centerpiece-overlay">
            <section className={`attentionCluster ${centerpiece.id}`} style={{ "--cluster-color": centerpiece.color } as CSSProperties} aria-label={centerpiece.title}>
              <div className="attentionClusterLabel">
                <centerpiece.icon size={14} />
                <span>{centerpiece.title}</span>
              </div>
              <div className="attentionClusterBody">
                {centerpiece.tags.filter((tag) => tag.label !== "TikTok Clips").map((tag) => (
                  <Link className={`attentionNode heatmap-tag-button ${tag.size}`} href={`/tags/${ecosystemTagSlug(tag.label)}`} key={tag.label}>
                    <tag.icon size={tag.iconSize ?? 14} />
                    <span>{tag.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type AttentionTagConfig = {
  label: string;
  icon: LucideIcon;
  size: "large" | "medium" | "small";
  badge?: "High" | "Rising";
  iconSize?: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

type AttentionClusterConfig = {
  id: string;
  title: string;
  color: string;
  icon: LucideIcon;
  top: number;
  left: number;
  width: number;
  height: number;
  tags: AttentionTagConfig[];
};

const attentionClusters: AttentionClusterConfig[] = [
  {
    id: "markets",
    title: "Trading & Markets",
    color: "#6FA7A2",
    icon: ChartNoAxesCombined,
    top: 70,
    left: 0,
    width: 330,
    height: 250,
    tags: [
      { label: "Trading Bots", icon: Bot, size: "large", badge: "High", top: 32, left: 35, width: 260, height: 52 },
      { label: "Prediction Markets", icon: ChartNoAxesCombined, size: "medium", top: 98, left: 55, width: 220, height: 40 },
      { label: "Market Analysis", icon: CircleDollarSign, size: "small", top: 150, left: 75, width: 180, height: 40 },
      { label: "Whale Tracking", icon: Pickaxe, size: "small", top: 202, left: 70, width: 190, height: 40 }
    ]
  },
  {
    id: "growth",
    title: "Growth & Sales",
    color: "#6FA7A2",
    icon: Megaphone,
    top: 70,
    left: 370,
    width: 330,
    height: 250,
    tags: [
      { label: "Mass Email", icon: Mail, size: "large", badge: "High", top: 32, left: 35, width: 260, height: 52 },
      { label: "Lead Generation", icon: UserPlus, size: "small", top: 98, left: 55, width: 220, height: 40 },
      { label: "Cold Outreach", icon: Send, size: "small", top: 150, left: 75, width: 180, height: 40 },
      { label: "Web Scraping", icon: Globe2, size: "medium", top: 202, left: 70, width: 190, height: 40 }
    ]
  },
  {
    id: "center",
    title: "Daily Buzz",
    color: "#6FA7A2",
    icon: Sparkles,
    top: 362,
    left: 185,
    width: 330,
    height: 150,
    tags: [
      { label: "TikTok Clips", icon: MousePointer2, size: "large", badge: "Rising", top: 24, left: 30, width: 270, height: 52 },
      { label: "Thumbnails", icon: FileText, size: "medium", top: 94, left: 75, width: 180, height: 40 }
    ]
  },
  {
    id: "builders",
    title: "Builder Tools",
    color: "#6FA7A2",
    icon: Code2,
    top: 575,
    left: 0,
    width: 330,
    height: 250,
    tags: [
      { label: "Websites", icon: Globe2, size: "large", badge: "High", top: 32, left: 35, width: 260, height: 52 },
      { label: "Vibe Coding", icon: Code2, size: "small", top: 98, left: 55, width: 220, height: 40 },
      { label: "Debugging", icon: Bug, size: "small", top: 150, left: 75, width: 180, height: 40 },
      { label: "3D Assets", icon: Box, size: "medium", top: 202, left: 70, width: 190, height: 40 }
    ]
  },
  {
    id: "ops",
    title: "Automation & Ops",
    color: "#6FA7A2",
    icon: Search,
    top: 575,
    left: 370,
    width: 330,
    height: 250,
    tags: [
      { label: "Research Agents", icon: Search, size: "large", badge: "Rising", top: 32, left: 25, width: 280, height: 52 },
      { label: "AI Employees", icon: Users, size: "small", top: 98, left: 55, width: 220, height: 40 },
      { label: "Video Editing", icon: Video, size: "small", top: 150, left: 75, width: 180, height: 40 },
      { label: "Automation", icon: BriefcaseBusiness, size: "medium", top: 202, left: 70, width: 190, height: 40 }
    ]
  }
];
