import type { CommerceChildCategory } from "@/lib/commerce-categories";

// Explicit UI-to-taxonomy crosswalk. Commerce membership still comes only from
// the graph's exact source IDs and verified typed relationships.
export const commerceHeatmapClassificationIds: Record<CommerceChildCategory, readonly string[]> = {
  Golf: ["603573", "937224"], Pickleball: [], Fitness: ["835336"], Running: ["969992", "603751"], Camping: ["835464"], Fishing: ["603818"],
  Dresses: ["842504"], Activewear: ["834568"], Shoes: ["601352"], Jewelry: ["953224"], Handbags: ["902408", "902536"], Menswear: ["824328"],
  Skincare: ["848776"], Makeup: ["848648"], Haircare: ["848904"], Fragrance: ["856208"], Bodycare: ["849160"], Nails: ["1086856"],
  Energy: ["917256"], Snacks: ["915336"], Coffee: ["700612"], Protein: ["1302416", "819984"], Hydration: ["917512"], Candy: ["921736"],
  Kitchen: ["600024"], Cleaning: ["852232"], Storage: ["851848"], Decor: ["852104"], Bedding: ["808328"], Bathroom: ["851976", "873096"],
  Dogs: ["818696", "813960", "812168", "812808", "816392", "818184", "815624"], Cats: ["818696", "813960", "812168", "812808", "816392", "818184", "815624"], Toys: ["604206"], Collectibles: ["951432"], Cards: ["810000"], Crafts: ["951560"],
};

export const commerceHeatmapParentClassificationIds: Record<string, readonly string[]> = {
  "Sports & Outdoors": ["603014"], "Fashion & Apparel": ["601152", "824328", "601352"], "Beauty & Personal Care": ["601450"], "Food & Beverage": ["700437"],
  "Home & Living": ["604453", "600001", "600024", "600154", "600942"], Pets: ["602118"], "Electronics & Tech": ["601739", "601755"],
  "Automotive & Motorcycle": ["605196"], "Health & Wellness": ["700645"], "Baby & Kids": ["602284", "802184"], "Toys & Collectibles": ["604206", "951432"],
  "Jewelry & Accessories": ["953224", "605248", "824584"], "Tools & Home Improvement": ["604579", "604968"], "Travel & Luggage": ["824584"], "Books & Entertainment": ["801928", "834312"],
};

const explicitHeatmapBucketIds: Record<string, readonly string[]> = {
  ...commerceHeatmapClassificationIds,
  Tennis: ["603221", "937608"], Basketball: ["603524", "936968"], Football: ["603041"], "Baseball & Softball": ["603652", "603744", "968712"], Soccer: ["603041", "603760"], Volleyball: ["603437"], "Running & Track": ["969992", "603247", "603751"], Cycling: ["838408"], Swimming: ["837256"], "Boxing & MMA": ["835592"], Wrestling: ["603301"], Gymnastics: ["969480"], Hockey: ["968328", "603625"], Skateboarding: ["603493"], Surfing: ["603131"], "Disc Golf": ["969736"], "Fitness & Gym": ["835336"], "Yoga & Pilates": ["603084"], "Camping & Hiking": ["835464"], Hunting: ["999944"], "Water Sports": ["835080"], "Winter Sports": ["835208"],
  "Tops & Shirts": ["842248", "839944"], "Pants & Trousers": ["842376", "840072"], "Jeans & Denim": ["601276", "601202"], Shorts: ["601266", "601196"], Skirts: ["601264"], Loungewear: ["843016", "840584"], Sleepwear: ["843016", "840584"], Outerwear: ["601267", "601197"], Swimwear: ["846224"], "Underwear & Lingerie": ["842888", "840456"], Shapewear: ["601259", "2157712"], "Suits & Formalwear": ["842760", "840712"], "Matching Sets": ["842760", "840712"], Costumes: ["842632", "840328"], "Shoes & Footwear": ["601352"], "Socks & Hosiery": ["842888", "840456"],
  "Body Care": ["849160"], "Hair Styling": ["848904"], "Wigs & Hair Extensions": ["810128"], "Makeup & Cosmetics": ["848648"], "Nails & Nail Art": ["1086856"], "Fragrance & Perfume": ["856208"], "Bath & Shower": ["849160"], "Oral Care": ["849672"], "Beauty Tools & Devices": ["849416"], "Personal Hygiene": ["981128"],
  "Candy & Chocolate": ["921736"], "Nuts & Dried Fruit": ["922248", "922504"], "Protein Bars & Snacks": ["915336", "1302416"], "Tea & Matcha": ["916488"], "Energy & Sports Drinks": ["917256"], "Juices & Smoothies": ["916744"], "Soda & Soft Drinks": ["916872"], "Water & Sparkling Water": ["843536", "917000"], "Drink Mixes & Powders": ["917512"], "Baking & Desserts": ["915208"], "Pantry Staples": ["914952"], "Sauces & Condiments": ["915080"], "Spices & Seasonings": ["919176"], "Instant & Ready-to-Eat Meals": ["914952", "807952"],
  Furniture: ["604453"], "Home Decor": ["852104"], "Kitchen & Dining": ["600024"], Laundry: ["852360"], "Storage & Organization": ["851848"], Lighting: ["872456"], "Household Appliances": ["600942"], "Outdoor Living": ["871176"],
  "Pet Food & Treats": ["812168"], "Pet Supplements & Wellness": ["818184"], "Pet Beds & Furniture": ["812808"], "Pet Clothing & Accessories": ["813960", "818696"], "Pet Grooming & Hygiene": ["816392"], "Aquariums & Fish Supplies": ["819848"], "Bird Supplies": ["821896"], "Small Animal Supplies": ["822792"], "Reptile & Amphibian Supplies": ["821000"],
  "Smartphones & Mobile Devices": ["995976"], "Phone Cases & Accessories": ["909064"], "Computers & Laptops": ["824840"], "Computer Accessories & Peripherals": ["826760", "984584"], "PC Components & Hardware": ["825352"], "Gaming Consoles & Accessories": ["909448"], "Audio Equipment": ["909320"], "Cameras & Creator Equipment": ["909192"], "Smartwatches & Wearables": ["909576", "2108944"], "Smart Home Devices": ["872840"], "Networking & Wi-Fi": ["829192"], "TVs & Home Entertainment": ["909320"],
  "Car Interior & Organization": ["930184"], "Car Exterior Accessories": ["930056"], "Car Cleaning & Detailing": ["940808"], "Car Electronics & Audio": ["929928"], "Vehicle Lighting": ["940424"], "Auto Replacement Parts": ["809488"], "Car Tools & Diagnostics": ["940296"], "Motorcycle Parts & Maintenance": ["809616"], "Motorcycle Riding Gear": ["940936"], "ATV & UTV Accessories": ["940680"], "RV & Camper Accessories": ["940680"],
  "Vitamins & Supplements": ["700646"], "Sports Nutrition & Performance": ["700649"], "First Aid & Medical Supplies": ["924424"], "Health Monitoring Devices": ["925064"],
  "Baby Clothing": ["877320"], "Kids' Clothing": ["802312", "803592"], "Baby & Kids' Footwear": ["877320", "805128", "806024"], "Baby Accessories": ["961928"], "Baby Feeding & Nursing": ["877832"], "Baby Travel & Carriers": ["877576"], "Car Seats & Baby Safety": ["878600"], "Nursery & Baby Sleep": ["878216"], "Baby & Toddler Development": ["878984"],
  "Figures & Figurines": ["953352"], "Dolls & Doll Accessories": ["859656"], "Plush Toys & Stuffed Animals": ["859656"], "Building Blocks & Construction Toys": ["859784"], "Educational & STEM Toys": ["859784"], "Board Games": ["860168"], "Card Games & Trading Cards": ["860168", "810000"], "Puzzles & Brain Teasers": ["860168"], "Remote-Control Toys": ["860040"], "Blind Boxes & Mystery Collectibles": ["1050248"], "Sports Collectibles & Memorabilia": ["937736"], "Outdoor Toys & Play Equipment": ["859912"], "Arts & Crafts Kits": ["951560"],
  Necklaces: ["605280"], Bracelets: ["953224"], Rings: ["605273"], Earrings: ["605268"], Watches: ["905480"], "Anklets & Body Jewelry": ["953224"], Wallets: [], Eyewear: ["905352"], Headwear: ["905224"], "Hair Accessories": ["905864"], Belts: ["906376"],
  "Power Tools": ["871560"], "Hand Tools & Tool Kits": ["871688"], "Hardware & Repair Supplies": ["872328"], "Electrical Supplies": ["872584"], "Plumbing Supplies": ["980488"], "Measuring & Layout Tools": ["871816"], "Tool Storage & Organization": ["872200"], "Lawn & Garden Tools": ["871944"], "Welding & Soldering Equipment": ["872072"],
  "Luggage & Suitcases": ["902664"], Backpacks: ["902792"], "Duffel & Weekender Bags": ["902792"], "Travel Accessories": ["902920"], "Packing & Organization": ["902920"], "Travel Bags & Organizers": ["902664", "902792"],
  "Children's Books": ["989704"], "Educational & Academic Books": ["992904"], "Comics, Manga & Graphic Novels": ["986760"], "Music & Vinyl Records": ["997384"], "Movies & Physical Media": ["997384"], "Stationery, Journals & Planners": ["831112"], "Arts & Crafts Supplies": ["951560"],
};

export function classificationIdsForHeatmapName(name: string): readonly string[] {
  return explicitHeatmapBucketIds[name] ?? commerceHeatmapParentClassificationIds[name] ?? [];
}

export function classificationIdForHeatmapName(name: string) {
  return classificationIdsForHeatmapName(name)[0] ?? null;
}
