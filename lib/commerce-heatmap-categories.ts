import type { CommerceChildCategory } from "@/lib/commerce-categories";

export const commerceHeatmapBucketAliases: Record<CommerceChildCategory, readonly string[]> = {
  Golf: ["Golf"],
  Pickleball: ["Pickleball"],
  Fitness: ["Fitness & Gym", "Yoga & Pilates"],
  Running: ["Running & Track"],
  Camping: ["Camping & Hiking"],
  Fishing: ["Fishing"],
  Dresses: ["Dresses"],
  Activewear: ["Activewear"],
  Shoes: ["Shoes & Footwear"],
  Jewelry: ["Necklaces", "Bracelets", "Rings", "Earrings", "Watches", "Anklets & Body Jewelry"],
  Handbags: ["Handbags"],
  Menswear: ["Suits & Formalwear", "Underwear & Lingerie"],
  Skincare: ["Skincare", "Tanning & Sun Care"],
  Makeup: ["Makeup & Cosmetics"],
  Haircare: ["Haircare", "Hair Styling", "Hair Color", "Wigs & Hair Extensions"],
  Fragrance: ["Fragrance & Perfume", "Deodorants & Antiperspirants", "Home Fragrance"],
  Bodycare: ["Body Care", "Bath & Shower", "Shaving & Hair Removal", "Personal Hygiene"],
  Nails: ["Nails & Nail Art"],
  Energy: ["Energy & Sports Drinks"],
  Snacks: ["Snacks", "Nuts & Dried Fruit", "Protein Bars & Snacks"],
  Coffee: ["Coffee"],
  Protein: ["Protein Bars & Snacks", "Sports Nutrition & Performance"],
  Hydration: ["Water & Sparkling Water", "Drink Mixes & Powders", "Juices & Smoothies"],
  Candy: ["Candy & Chocolate"],
  Kitchen: ["Kitchen & Dining"],
  Cleaning: ["Cleaning", "Laundry"],
  Storage: ["Storage & Organization"],
  Decor: ["Home Decor", "Lighting", "Rugs & Curtains", "Seasonal & Holiday Decor"],
  Bedding: ["Bedding"],
  Bathroom: ["Bathroom", "Bath & Shower"],
  Dogs: ["Pet Food & Treats", "Pet Supplements & Wellness", "Pet Toys", "Pet Beds & Furniture", "Pet Clothing & Accessories", "Collars, Leashes & Harnesses", "Pet Grooming & Hygiene", "Pet Training", "Pet Bowls & Feeders"],
  Cats: ["Pet Food & Treats", "Pet Supplements & Wellness", "Pet Toys", "Pet Beds & Furniture", "Pet Clothing & Accessories", "Collars, Leashes & Harnesses", "Pet Grooming & Hygiene", "Pet Training", "Pet Bowls & Feeders"],
  Toys: ["Figures & Figurines", "Dolls & Doll Accessories", "Plush Toys & Stuffed Animals", "Building Blocks & Construction Toys", "Educational & STEM Toys", "Remote-Control Toys", "Outdoor Toys & Play Equipment", "Pretend Play & Roleplay Toys", "Fidget & Sensory Toys"],
  Collectibles: ["Models & Miniatures", "Blind Boxes & Mystery Collectibles", "Anime & Pop Culture Collectibles", "Sports Collectibles & Memorabilia"],
  Cards: ["Card Games & Trading Cards"],
  Crafts: ["Arts & Crafts Kits", "Arts & Crafts Supplies"],
};

export const commerceHeatmapCategories = Object.keys(commerceHeatmapBucketAliases) as CommerceChildCategory[];

export function isCommerceHeatmapCategory(value: string | null): value is CommerceChildCategory {
  return value !== null && Object.prototype.hasOwnProperty.call(commerceHeatmapBucketAliases, value);
}
