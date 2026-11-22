import { notFound } from "next/navigation";
import { getCreatorMasterDetail } from "@/lib/server/creator-master-read";
import { getPartnerlinksVisibleCategory } from "@/lib/partnerlinks-taxonomy";

export const dynamic = "force-dynamic";

export default async function CreatorMasterProfile({ params }: { params: { id: string } }) {
  const data = await getCreatorMasterDetail(decodeURIComponent(params.id));
  if (!data) notFound();
  const c = data.creator;
  return <div className="stack">
    <section className="pageHeading"><div>
      {c.avatar_url ? <img className="shopAvatarFallback" src={String(c.avatar_url)} alt="" width={64} height={64} /> : null}
      <span className="eyebrow">Canonical creator {String(c.account_id)}</span><h1>{String(c.display_name || c.username)}</h1><p>@{String(c.username)} · {Number(c.follower_count ?? 0).toLocaleString()} followers{Number(c.source_record_count)>1?` · ${Number(c.source_record_count).toLocaleString()} preserved source records`:""}</p>
    </div>{c.profile_url ? <a href={String(c.profile_url)} target="_blank" rel="noreferrer">Open TikTok profile ↗</a> : null}</section>
    <section className="statGrid"><article><span>Canonical videos</span><strong>{Number(c.canonical_video_count).toLocaleString()}</strong></article><article><span>Snapshot 30-day videos</span><strong>{Number(c.recent_snapshot_video_count).toLocaleString()}</strong></article><article><span>Verified products</span><strong>{c.verified_product_evidence ? "Available" : "No collected evidence"}</strong></article><article><span>Approved classifications</span><strong>{c.approved_classification_evidence ? "Available" : "No collected evidence"}</strong></article></section>
    <p className="taxonomySnapshotNote">Activity window: October 12–November 11, 2026. No evidence in this snapshot is not a claim that the creator is inactive.</p>
    <section className="sidePanel"><h2>Verified classification evidence</h2>{data.classifications.length ? data.classifications.map((row: any) => <div className="miniRow" key={row.classificationId}><span><strong>{getPartnerlinksVisibleCategory(String(row.classificationId))?.name ?? row.classificationId}</strong><small>{Number(row.productCount).toLocaleString()} products · {Number(row.videoCount).toLocaleString()} videos</small></span></div>) : <p>No verified classification evidence has been collected.</p>}</section>
    <section className="sidePanel"><h2>Canonical video evidence</h2>{data.verifiedVideos.length ? <div className="miniRows">{data.verifiedVideos.slice(0, 100).map((row: any[]) => <div className="miniRow" key={row[0]}><span><strong>{row[0]}</strong><small>{row[1] ? new Date(Number(row[1]) * 1000).toISOString().slice(0, 10) : "Timestamp unavailable"} · {row[2]}</small></span></div>)}</div> : <p>No canonical video evidence was collected.</p>}</section>
    {data.ambiguousVideos.length ? <section className="sidePanel"><h2>Conflicted attribution — excluded from verified results</h2><p>{data.ambiguousVideos.length.toLocaleString()} video associations are preserved separately and do not create commercial membership.</p></section> : null}
  </div>;
}
