import type {
  CommerceCategory,
  CommerceChildCategory,
  CommerceParentCategory,
} from "@/lib/commerce-categories";

export type TikTokCreatorCategory = {
  parentId: string;
  parentName: string;
  childId: string;
  childName: string;
};

type DirectCreatorCategoryMapping = {
  status: "mapped";
  source: TikTokCreatorCategory;
  graphParent: CommerceParentCategory;
  graphChildren: readonly CommerceChildCategory[];
};

type AmbiguousCreatorCategoryMapping = {
  status: "ambiguous";
  source: TikTokCreatorCategory;
  graphParent: CommerceParentCategory;
  graphChildren: readonly [];
  possibleGraphChildren: readonly CommerceChildCategory[];
  reason: string;
};

export type CreatorCategoryMapping =
  | DirectCreatorCategoryMapping
  | AmbiguousCreatorCategoryMapping;

export type CreatorCategoryResolution =
  | CreatorCategoryMapping
  | {
      status: "unmapped";
      source: TikTokCreatorCategory;
      graphParent: null;
      graphChildren: readonly [];
    };

// Creator Marketplace category IDs are deliberately mapped explicitly. Names are
// retained as source metadata, but never used to infer PartnerLinks membership.
export const creatorCategoryMappings = [
  {
    status: "mapped",
    source: {
      parentId: "601450",
      parentName: "Beauty & Personal Care",
      childId: "848648",
      childName: "Makeup",
    },
    graphParent: "Beauty & Care",
    graphChildren: ["Makeup"],
  },
  {
    status: "mapped",
    source: {
      parentId: "600001",
      parentName: "Home Supplies",
      childId: "852104",
      childName: "Home Decor",
    },
    graphParent: "Home & Living",
    graphChildren: ["Decor"],
  },
  {
    status: "mapped",
    source: {
      parentId: "603014",
      parentName: "Sports & Outdoor",
      childId: "835336",
      childName: "Fitness",
    },
    graphParent: "Sports & Outdoors",
    graphChildren: ["Fitness"],
  },
  {
    status: "mapped",
    source: {
      parentId: "700437",
      parentName: "Food & Beverages",
      childId: "915336",
      childName: "Snacks",
    },
    graphParent: "Food & Beverage",
    graphChildren: ["Snacks"],
  },
  {
    status: "ambiguous",
    source: {
      parentId: "602118",
      parentName: "Pet Supplies",
      childId: "812168",
      childName: "Dog & Cat Food",
    },
    graphParent: "Pets & Hobbies",
    graphChildren: [],
    possibleGraphChildren: ["Dogs", "Cats"],
    reason:
      "The source category combines dogs and cats, and Marketplace list data does not provide category-level GMV that can resolve the child category.",
  },
] as const satisfies readonly CreatorCategoryMapping[];

const mappingsById = new Map(
  creatorCategoryMappings.map((mapping) => [
    `${mapping.source.parentId}:${mapping.source.childId}`,
    mapping,
  ])
);

export function resolveCreatorCategory(
  source: TikTokCreatorCategory
): CreatorCategoryResolution {
  return (
    mappingsById.get(`${source.parentId}:${source.childId}`) ?? {
      status: "unmapped",
      source,
      graphParent: null,
      graphChildren: [],
    }
  );
}

export function getCreatorGraphMembership(
  sourceCategories: readonly TikTokCreatorCategory[]
) {
  const parents = new Set<CommerceParentCategory>();
  const children = new Set<CommerceChildCategory>();
  const unresolved: CreatorCategoryResolution[] = [];

  for (const source of sourceCategories) {
    const resolution = resolveCreatorCategory(source);

    if (resolution.graphParent) parents.add(resolution.graphParent);
    for (const child of resolution.graphChildren) children.add(child);
    if (resolution.status !== "mapped") unresolved.push(resolution);
  }

  return {
    parents: [...parents],
    children: [...children],
    unresolved,
  };
}

type CreatorWithCategories = {
  creator_oecuid: string;
  sourceCategories: readonly TikTokCreatorCategory[];
};

export function selectCreatorsForGraph<T extends CreatorWithCategories>(
  creators: readonly T[],
  category: "All" | CommerceCategory
) {
  const uniqueCreators = new Map<string, T>();

  for (const creator of creators) {
    if (uniqueCreators.has(creator.creator_oecuid)) continue;

    if (category !== "All") {
      const membership = getCreatorGraphMembership(creator.sourceCategories);
      if (
        !membership.parents.includes(category as CommerceParentCategory) &&
        !membership.children.includes(category as CommerceChildCategory)
      ) {
        continue;
      }
    }

    uniqueCreators.set(creator.creator_oecuid, creator);
  }

  return [...uniqueCreators.values()];
}
