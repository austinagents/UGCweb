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

export const tiktokShopCategories = [
  { id: "600001", name: "Home Supplies" },
  { id: "600024", name: "Kitchenware" },
  { id: "600154", name: "Textiles & Soft Furnishings" },
  { id: "600942", name: "Household Appliances" },
  { id: "601152", name: "Womenswear & Underwear" },
  { id: "601303", name: "Modest Fashion" },
  { id: "601352", name: "Shoes" },
  { id: "601450", name: "Beauty & Personal Care" },
  { id: "601739", name: "Phones & Electronics" },
  { id: "601755", name: "Computers & Office Equipment" },
  { id: "602118", name: "Pet Supplies" },
  { id: "602284", name: "Baby & Maternity" },
  { id: "603014", name: "Sports & Outdoor" },
  { id: "604206", name: "Toys & Hobbies" },
  { id: "604453", name: "Furniture" },
  { id: "604579", name: "Tools & Hardware" },
  { id: "604968", name: "Home Improvement" },
  { id: "605196", name: "Automotive & Motorcycle" },
  { id: "605248", name: "Fashion Accessories" },
  { id: "700437", name: "Food & Beverages" },
  { id: "700645", name: "Health" },
  { id: "801928", name: "Books, Magazines & Audio" },
  { id: "802184", name: "Kids' Fashion" },
  { id: "824328", name: "Menswear & Underwear" },
  { id: "824584", name: "Luggage & Bags" },
  { id: "834312", name: "Virtual Products" },
  { id: "856720", name: "Pre-Owned" },
  { id: "951432", name: "Collectibles" },
  { id: "953224", name: "Jewelry Accessories & Derivatives" },
] as const;

export const defaultTikTokShopCategoryId = "700645";

export const tiktokShopCategoryGroups = [
  { name: "Home & Living", icon: "home", categoryIds: ["600001", "600024", "600154", "600942", "604453"] },
  { name: "Fashion", icon: "fashion", categoryIds: ["601152", "601303", "601352", "605248", "824328"] },
  { name: "Beauty & Health", icon: "beauty", categoryIds: ["601450", "700645", "602284", "802184", "953224"] },
  { name: "Electronics & Auto", icon: "electronics", categoryIds: ["601739", "601755", "604579", "605196", "604968"] },
  { name: "Family & Hobbies", icon: "hobbies", categoryIds: ["602118", "604206", "801928", "834312", "951432"] },
  { name: "Food & Outdoors", icon: "outdoors", categoryIds: ["603014", "700437", "824584", "856720"] },
] as const;

export const tiktokShopCategoryDisplayNames: Record<string, string> = {
  "600001": "Home Supplies",
  "600024": "Kitchenware",
  "600154": "Textiles",
  "600942": "Appliances",
  "601152": "Womenswear",
  "601303": "Modest Fashion",
  "601352": "Shoes",
  "601450": "Beauty & Care",
  "601739": "Phones",
  "601755": "Computers",
  "602118": "Pet Supplies",
  "602284": "Baby & Maternity",
  "603014": "Sports & Outdoor",
  "604206": "Toys & Hobbies",
  "604453": "Furniture",
  "604579": "Tools & Hardware",
  "604968": "Home Improvement",
  "605196": "Automotive",
  "605248": "Accessories",
  "700437": "Food & Beverage",
  "700645": "Health",
  "801928": "Books & Audio",
  "802184": "Kids' Fashion",
  "824328": "Menswear",
  "824584": "Luggage & Bags",
  "834312": "Virtual Products",
  "856720": "Pre-Owned",
  "951432": "Collectibles",
  "953224": "Jewelry",
};

export type TikTokShopCategoryId = typeof tiktokShopCategories[number]["id"];
export type TikTokShopCategoryName = typeof tiktokShopCategories[number]["name"];

export const commerceNavigationCategories = [
  { key: "sports-outdoor", name: "Sports & Outdoor", categoryIds: ["603014"] },
  { key: "food-beverages", name: "Food & Beverages", categoryIds: ["700437"] },
  { key: "womenswear-underwear", name: "Womenswear", categoryIds: ["601152", "601303"] },
  { key: "menswear-underwear", name: "Menswear", categoryIds: ["824328"] },
  { key: "shoes", name: "Shoes", categoryIds: ["601352"] },
  { key: "beauty-personal-care", name: "Beauty", categoryIds: ["601450"] },
  { key: "kitchenware", name: "Kitchenware", categoryIds: ["600024"] },
  { key: "textiles-furniture", name: "Textiles & Furnishings", categoryIds: ["600154", "604453"] },
  { key: "electronics", name: "Electronics", categoryIds: ["601739", "601755"] },
  { key: "home-supplies", name: "Home Supplies", categoryIds: ["600001", "600942"] },
  { key: "pet-supplies", name: "Pet Supplies", categoryIds: ["602118"] },
  { key: "health", name: "Health", categoryIds: ["700645"] },
  { key: "fashion-jewelry", name: "Fashion Accessories", categoryIds: ["605248", "953224"] },
  { key: "toys-hobbies", name: "Toys & Hobbies", categoryIds: ["604206"] },
  { key: "tools-home-improvement", name: "Tools & Hardware", categoryIds: ["604579", "604968"] },
  { key: "automotive-motorcycle", name: "Automotive & Motorcycle", categoryIds: ["605196"] },
  { key: "books-audio", name: "Books, Magazines & Audio", categoryIds: ["801928"] },
  { key: "luggage-bags", name: "Luggage & Bags", categoryIds: ["824584"] },
  { key: "collectibles", name: "Collectibles", categoryIds: ["951432", "856720"] },
  { key: "virtual-products", name: "Virtual Products", categoryIds: ["834312"] },
  { key: "kids-fashion", name: "Kids", categoryIds: ["802184"] },
  { key: "baby-maternity", name: "Baby & Maternity", categoryIds: ["602284"] },
] as const;

export type CommerceNavigationCategoryName = typeof commerceNavigationCategories[number]["name"];

const creatorCategoryAliases: Record<CommerceCategory, CommerceNavigationCategoryName> = {
  "Sports & Outdoors": "Sports & Outdoor",
  Golf: "Sports & Outdoor",
  Pickleball: "Sports & Outdoor",
  Fitness: "Sports & Outdoor",
  Running: "Sports & Outdoor",
  Camping: "Sports & Outdoor",
  Fishing: "Sports & Outdoor",
  Fashion: "Fashion Accessories",
  Dresses: "Womenswear",
  Activewear: "Sports & Outdoor",
  Shoes: "Shoes",
  Jewelry: "Fashion Accessories",
  Handbags: "Luggage & Bags",
  Menswear: "Menswear",
  "Beauty & Care": "Beauty",
  Skincare: "Beauty",
  Makeup: "Beauty",
  Haircare: "Beauty",
  Fragrance: "Beauty",
  Bodycare: "Beauty",
  Nails: "Beauty",
  "Food & Beverage": "Food & Beverages",
  Energy: "Food & Beverages",
  Snacks: "Food & Beverages",
  Coffee: "Food & Beverages",
  Protein: "Health",
  Hydration: "Food & Beverages",
  Candy: "Food & Beverages",
  "Home & Living": "Home Supplies",
  Kitchen: "Kitchenware",
  Cleaning: "Home Supplies",
  Storage: "Home Supplies",
  Decor: "Home Supplies",
  Bedding: "Textiles & Furnishings",
  Bathroom: "Home Supplies",
  "Pets & Hobbies": "Pet Supplies",
  Dogs: "Pet Supplies",
  Cats: "Pet Supplies",
  Toys: "Toys & Hobbies",
  Collectibles: "Collectibles",
  Cards: "Collectibles",
  Crafts: "Toys & Hobbies",
};

const creatorQueryCategoryRules: Array<[CommerceNavigationCategoryName, RegExp]> = [
  ["Sports & Outdoor", /sport|fitness|running|golf|camp|fish|workout|gym|yoga|cycling|outdoor/],
  ["Food & Beverages", /food|snack|coffee|drink|beverage|candy|fruit|protein|grocery|tea|water|hydration/],
  ["Womenswear", /women|dress|lingerie|bra|skirt|blouse/],
  ["Menswear", /men|suit|necktie/],
  ["Shoes", /shoe|sneaker|boot|footwear|sandal/],
  ["Beauty", /beauty|cosmetic|makeup|skin|hair|fragrance|perfume|nail|self care/],
  ["Kitchenware", /kitchen|cook|bake|dining|tableware|barbecue/],
  ["Textiles & Furnishings", /textile|furniture|bedding|pillow|blanket|curtain|rug|mattress/],
  ["Electronics", /phone|computer|laptop|tablet|electronic|audio|camera|cable|wi-fi|printer|smartwatch|drone/],
  ["Pet Supplies", /pet|dog|cat|aquarium/],
  ["Health", /health|medical|first aid|supplement|massage|recovery|wheelchair/],
  ["Fashion Accessories", /jewelry|jewellery|bracelet|necklace|watch|accessor|sunglass/],
  ["Toys & Hobbies", /toy|game|craft|hobby|doll|plush|kite/],
  ["Tools & Hardware", /tool|hardware|repair|building|workshop|electrical equipment/],
  ["Automotive & Motorcycle", /car|auto|vehicle|motorcycle|engine|truck/],
  ["Books, Magazines & Audio", /book|magazine|vinyl|record|literature/],
  ["Luggage & Bags", /bag|luggage|purse|backpack|travel case/],
  ["Collectibles", /collectible|memorabilia|trading card|pre-owned|antique/],
  ["Virtual Products", /virtual|software|digital|download/],
  ["Kids", /kid|child|boy|girl|school/],
  ["Baby & Maternity", /baby|maternity|infant|toddler/],
  ["Home Supplies", /home|clean|storage|decor|bathroom|garden|household|organizer/],
];

export function creatorShopCategories(categories: readonly CommerceCategory[], sourceQueries: readonly string[] = []) {
  const mapped = [...new Set(categories.map((category) => creatorCategoryAliases[category]))];
  if (mapped.length > 0) return mapped;
  const queryText = sourceQueries.join(" ").toLowerCase();
  return [creatorQueryCategoryRules.find(([, pattern]) => pattern.test(queryText))?.[0] ?? "Home Supplies"];
}

export function commerceNavigationCategoryForId(categoryId: string) {
  return commerceNavigationCategories.find((category) => category.categoryIds.some((id) => id === categoryId))?.name ?? "Home Supplies";
}
