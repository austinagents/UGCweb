export const commerceCategoryGroups = [
  { name: "Sports & Outdoors", children: ["Golf", "Pickleball", "Fitness", "Running", "Camping", "Fishing"] },
  { name: "Fashion", children: ["Dresses", "Activewear", "Shoes", "Jewelry", "Handbags", "Menswear"] },
  { name: "Beauty & Care", children: ["Skincare", "Makeup", "Haircare", "Fragrance", "Bodycare", "Nails"] },
  { name: "Food & Beverage", children: ["Energy", "Snacks", "Coffee", "Protein", "Hydration", "Candy"] },
  { name: "Home & Living", children: ["Kitchen", "Cleaning", "Storage", "Decor", "Bedding", "Bathroom"] },
  { name: "Pets & Hobbies", children: ["Dogs", "Cats", "Toys", "Collectibles", "Cards", "Crafts"] }
] as const;

export type CommerceParentCategory = typeof commerceCategoryGroups[number]["name"];
export type CommerceChildCategory = typeof commerceCategoryGroups[number]["children"][number];
export type CommerceCategory = CommerceParentCategory | CommerceChildCategory;

export const commerceParentCategories = commerceCategoryGroups.map((group) => group.name);
