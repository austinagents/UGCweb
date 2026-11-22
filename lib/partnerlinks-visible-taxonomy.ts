import hierarchy from "../data/partnerlinks-taxonomy/taxonomy_visible.json" with { type: "json" };

export type VisibleClassification = {
  id: string;
  parentId: string | null;
  level: number;
  name: string;
  rootId: string;
  path: string[];
};

export const visibleClassifications = hierarchy.categories as VisibleClassification[];
const byId = new Map(visibleClassifications.map((category) => [category.id, category]));
const childrenByParent = new Map<string, VisibleClassification[]>();
for (const category of visibleClassifications) {
  if (!category.parentId) continue;
  const children = childrenByParent.get(category.parentId) ?? [];
  children.push(category);
  childrenByParent.set(category.parentId, children);
}

export const visibleClassificationRoots = visibleClassifications.filter((category) => category.level === 1);
export const visibleClassificationById = (id: string | null | undefined) => id ? byId.get(id) ?? null : null;
export const visibleClassificationChildren = (id: string) => childrenByParent.get(id) ?? [];
export const visibleClassificationAncestors = (id: string) => {
  const category = byId.get(id);
  return category ? category.path.map((ancestorId) => byId.get(ancestorId)).filter((row): row is VisibleClassification => Boolean(row)) : [];
};
export const visibleClassificationSlug = (category: Pick<VisibleClassification, "id" | "name">) =>
  `${category.id}-${category.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
export const visibleClassificationFromSlug = (slug: string) => visibleClassificationById(slug.split("-", 1)[0]);
