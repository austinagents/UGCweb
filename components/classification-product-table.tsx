"use client";
import { useEffect, useState } from "react";
import { formatUtcCalendarDate } from "@/lib/utc-date";

type Product = { productId:string; sourceCategoryId:string; relationshipCount:number; videoCount:number; creatorCount:number; sellerCount:number; recentVideoCount:number; latestObservedTimestamp:string|null; sourceKind:string };
type ResponseData = { products:Product[]; page:number; pageSize:number; total:number; totalPages:number; snapshotTimestamp:string };

export function ClassificationProductTable({ classificationId, classificationIds=[], active=true }:{classificationId?:string|null;classificationIds?:readonly string[];active?:boolean}) {
  const [page,setPage]=useState(1),[data,setData]=useState<ResponseData|null>(null),[error,setError]=useState("");
  const classificationIdsKey=classificationIds.join(",");
  useEffect(()=>{if(!active)return;let cancelled=false;setError("");const params=new URLSearchParams({page:String(page)});if(classificationId)params.set("classification_id",classificationId);if(classificationIdsKey)params.set("classification_ids",classificationIdsKey);fetch(`/api/classification-products?${params}`).then((r)=>{if(!r.ok)throw new Error("Failed to load products");return r.json() as Promise<ResponseData>;}).then((value)=>{if(!cancelled)setData(value);}).catch((cause)=>{if(!cancelled)setError(cause instanceof Error?cause.message:"Failed to load products");});return()=>{cancelled=true};},[active,classificationId,classificationIdsKey,page]);
  const products=data?.products??[];
  return <><div className="tableWrap shopTableWrap"><table className="terminalTable focusedToolsTable shopScreenerTable"><thead><tr><th>Product ID</th><th>Source category</th><th>Videos</th><th>Creators</th><th>Sellers</th><th>Snapshot activity</th></tr></thead><tbody>
    {!data&&!error?<tr className="shopStateRow"><td colSpan={6}>Loading verified products…</td></tr>:null}
    {error?<tr className="shopStateRow"><td colSpan={6}>{error}</td></tr>:null}
    {data&&!products.length?<tr className="shopStateRow"><td colSpan={6}>No verified product-category evidence is available for this classification.</td></tr>:null}
    {products.map((product)=><tr key={product.productId}><td><strong>{product.productId}</strong></td><td>{product.sourceCategoryId}</td><td>{product.videoCount.toLocaleString()}</td><td>{product.creatorCount.toLocaleString()}</td><td>{product.sellerCount.toLocaleString()}</td><td>{product.recentVideoCount.toLocaleString()} videos</td></tr>)}
  </tbody></table></div><div className="shopPagination creatorTableStatus"><span>{data?`${data.total.toLocaleString()} verified products · activity window ended ${formatUtcCalendarDate(data.snapshotTimestamp) ?? "the graph cutoff"}`:"Loading…"}</span><div><button disabled={!data||data.page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>← Previous</button><strong>Page {data?.page??1} of {data?.totalPages??1}</strong><button disabled={!data||data.page>=data.totalPages} onClick={()=>setPage((p)=>p+1)}>Next →</button></div></div></>;
}
