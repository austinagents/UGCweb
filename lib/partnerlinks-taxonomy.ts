import projection from "../data/partnerlinks-taxonomy/taxonomy_projection.json" with { type: "json" };

export type TaxonomyUiStatus = "visible" | "rolled_up" | "excluded_from_ui";
export type SourceTaxonomyCategory = { id:string; parentId:string|null; level:number; name:string; rootId:string; path:string[]; uiStatus:TaxonomyUiStatus; effectiveCutoffLevel:number|null; ruleOrigin:string; visibleBucketId:string|null };
export type VisibleTaxonomyCategory = Pick<SourceTaxonomyCategory,"id"|"parentId"|"level"|"name"|"rootId"|"path">;
const sources=projection.sourceCategories as SourceTaxonomyCategory[], visible=projection.visibleCategories as VisibleTaxonomyCategory[];
const sourceById=new Map(sources.map(row=>[row.id,row])), visibleById=new Map(visible.map(row=>[row.id,row]));
export const partnerlinksTaxonomyVersion=projection.version;
export const getPartnerlinksSourceCategory=(id:string)=>sourceById.get(id)??null;
export const getPartnerlinksVisibleCategory=(id:string)=>visibleById.get(id)??null;
export function resolvePartnerlinksVisibleClassification(value:string|null|undefined) {
  if (!value) return { status:"absent" as const, category:null };
  const category=getPartnerlinksVisibleCategory(value);
  return category ? { status:"valid" as const, category } : { status:"invalid" as const, category:null };
}
export function classifyPartnerlinksCategory(id:string) {
  const sourceCategory=getPartnerlinksSourceCategory(id);
  if(!sourceCategory)return {status:"unknown" as const,sourceCategory:null,visibleCategory:null};
  if(sourceCategory.uiStatus==="excluded_from_ui")return {status:"excluded_from_ui" as const,sourceCategory,visibleCategory:null};
  const visibleCategory=getPartnerlinksVisibleCategory(sourceCategory.visibleBucketId!);
  if(!visibleCategory)throw new Error(`Missing visible taxonomy bucket ${sourceCategory.visibleBucketId}`);
  return {status:sourceCategory.uiStatus,sourceCategory,visibleCategory};
}
export const getPartnerlinksVisibleTaxonomy=()=>visible;
export const getPartnerlinksVisibleTaxonomyRoots=()=>visible.filter(row=>row.level===1);
export const getPartnerlinksVisibleTaxonomyChildren=(parentId:string)=>visible.filter(row=>row.parentId===parentId);
export const getPartnerlinksVisibleIdsForSubtree=(categoryId:string)=>visible.filter(row=>row.path.includes(categoryId)).map(row=>row.id);
export function getPartnerlinksSourceIdsForVisibleSubtree(categoryId:string) {
  if(!visibleById.has(categoryId))return [];
  return sources.filter(row=>row.uiStatus!=="excluded_from_ui"&&row.path.includes(categoryId)).map(row=>row.id);
}
