import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const crawlRoot = "/Users/austin/Documents/Codex/2026-10-06/we-just-changed-our-tiktok-shop/outputs/storefront-enrichment-production-148198/shops";
const database = new DatabaseSync(path.join(process.cwd(), "data/tiktok-shops.sqlite"), { readOnly: true });
const marketSource = fs.readFileSync(path.join(process.cwd(), "lib/heatmap-markets.ts"), "utf8");
const marketMatches = [...marketSource.matchAll(/\{ name: "([^"]+)", buckets: \[([^\]]+)\] \}/g)];
const markets = marketMatches.map((match) => ({ name: match[1], buckets: [...match[2].matchAll(/"([^"]+)"/g)].map((item) => item[1]) }));

const marketCategoryIds = {
  "Sports & Outdoors": ["603014"],
  "Fashion & Apparel": ["601152", "601303", "601352", "824328"],
  "Beauty & Personal Care": ["601450"],
  "Food & Beverage": ["700437"],
  "Home & Living": ["600001", "600024", "600154", "600942", "604453"],
  Pets: ["602118"],
  "Electronics & Tech": ["601739", "601755"],
  "Automotive & Motorcycle": ["605196"],
  "Health & Wellness": ["700645"],
  "Baby & Kids": ["602284", "802184"],
  "Toys & Collectibles": ["604206", "951432"],
  "Jewelry & Accessories": ["605248", "824584", "953224"],
  "Tools & Home Improvement": ["604579", "604968"],
  "Travel & Luggage": ["824584"],
  "Books & Entertainment": ["801928"],
};

const aliases = {
  "Baseball & Softball": ["baseball", "softball"], "Running & Track": ["running", "runner", "track"], "Boxing & MMA": ["boxing", "mma", "martial art"],
  "Football": ["american football", "football helmet", "football shoulder pad", "football receiver glove", "football training", "football cleat"],
  "Tennis": ["tennis", "racket", "racquet"],
  "Fitness & Gym": ["fitness", "gym", "workout"], "Yoga & Pilates": ["yoga", "pilates"], "Camping & Hiking": ["camping", "hiking"],
  "Dresses": ["dress", "gown"], "Tops & Shirts": ["shirt", "blouse", "top"], "Pants & Trousers": ["pants", "trousers"], "Jeans & Denim": ["jeans", "denim"],
  "Shorts": ["shorts", "short pants"], "Skirts": ["skirt"], "Activewear": ["activewear", "workout clothing", "athletic wear"], "Loungewear": ["loungewear", "lounge set"],
  "Sleepwear": ["sleepwear", "pajama", "nightgown"], "Outerwear": ["outerwear", "jacket", "coat"], "Swimwear": ["swimwear", "swimsuit", "bikini"],
  "Shapewear": ["shapewear", "body shaper"], "Matching Sets": ["matching set", "two piece set", "2 piece set"], "Costumes": ["costume", "cosplay"],
  "Underwear & Lingerie": ["underwear", "lingerie", "bra", "panties"], "Suits & Formalwear": ["suit", "formalwear", "tuxedo"], "Shoes & Footwear": ["shoe", "sneaker", "boot", "sandal", "footwear"],
  "Skincare": ["skin care", "skincare", "serum", "moisturizer"], "Body Care": ["body care", "body wash", "body lotion"], "Hair Styling": ["hair styling", "styler", "hair gel", "hair spray"],
  "Makeup & Cosmetics": ["makeup", "cosmetic", "lipstick", "mascara", "foundation"], "Nails & Nail Art": ["nail", "manicure"], "Fragrance & Perfume": ["fragrance", "perfume", "cologne"],
  "Bath & Shower": ["bath", "shower"], "Shaving & Hair Removal": ["shaving", "razor", "hair removal"], "Beauty Tools & Devices": ["beauty tool", "beauty device"],
  "Candy & Chocolate": ["candy", "chocolate"], "Nuts & Dried Fruit": ["nuts", "dried fruit"], "Protein Bars & Snacks": ["protein bar", "protein snack"],
  "Tea & Matcha": ["tea", "matcha"], "Energy & Sports Drinks": ["energy drink", "sports drink"], "Juices & Smoothies": ["juice", "smoothie"],
  "Water & Sparkling Water": ["sparkling water", "bottled water"], "Drink Mixes & Powders": ["drink mix", "drink powder"], "Sauces & Condiments": ["sauce", "condiment", "ketchup", "mustard"],
  "Spices & Seasonings": ["spice", "seasoning"], "Instant & Ready-to-Eat Meals": ["instant meal", "ready to eat"],
  "Kitchen & Dining": ["kitchen", "cookware", "dining"], "Storage & Organization": ["storage", "organizer", "organization"], "Household Appliances": ["appliance"],
  "Rugs & Curtains": ["rug", "curtain"], "Lawn & Garden": ["lawn", "garden"], "Seasonal & Holiday Decor": ["holiday decor", "seasonal decor", "christmas decor"],
  "Pet Food & Treats": ["pet food", "dog food", "cat food", "pet treat", "dog treat", "cat treat"], "Pet Supplements & Wellness": ["pet supplement", "dog supplement", "cat supplement"],
  "Pet Toys": ["pet toy", "dog toy", "cat toy", "squeaky toy", "chew toy"],
  "Pet Beds & Furniture": ["pet bed", "dog bed", "cat bed", "cat tree"], "Collars, Leashes & Harnesses": ["collar", "leash", "harness"], "Pet Grooming & Hygiene": ["pet grooming", "dog grooming", "cat grooming", "pet shampoo"],
  "Pet Bowls & Feeders": ["pet bowl", "dog bowl", "cat bowl", "pet feeder"], "Aquariums & Fish Supplies": ["aquarium", "fish tank", "fish supplies"],
  "Smartphones & Mobile Devices": ["smartphone", "mobile phone", "cell phone"], "Phone Cases & Accessories": ["phone case", "phone accessory"], "Computers & Laptops": ["computer", "laptop", "notebook pc"],
  "Computer Accessories & Peripherals": ["keyboard", "mouse", "computer accessory", "peripheral"], "PC Components & Hardware": ["pc component", "graphics card", "motherboard", "computer hardware"],
  "Gaming Consoles & Accessories": ["gaming console", "game controller", "console accessory"], "Cameras & Creator Equipment": ["camera", "tripod", "ring light", "creator equipment"],
  "Smartwatches & Wearables": ["smartwatch", "fitness tracker", "wearable"], "Networking & Wi-Fi": ["router", "wifi", "wi fi", "networking"], "TVs & Home Entertainment": ["television", "smart tv", "home theater"],
  "Charging & Connectivity": ["charger", "charging", "usb cable", "adapter"], "Drones & Remote-Control Tech": ["drone", "remote control"],
  "Car Interior & Organization": ["car interior", "car organizer", "seat organizer"], "Car Exterior Accessories": ["car exterior", "exterior accessory"], "Car Cleaning & Detailing": ["car cleaning", "car detailing"],
  "Car Electronics & Audio": ["car audio", "car electronic", "dash cam"], "Car Performance & Tuning": ["performance", "tuning"], "Auto Replacement Parts": ["replacement part", "auto part"],
  "Car Maintenance & Fluids": ["motor oil", "car fluid", "maintenance"], "Car Tools & Diagnostics": ["diagnostic", "obd", "car tool"], "Motorcycle Parts & Maintenance": ["motorcycle part", "motorcycle maintenance"],
  "Vitamins & Supplements": ["vitamin", "supplement"], "Sports Nutrition & Performance": ["sports nutrition", "pre workout", "creatine"], "Digestive & Gut Health": ["digestive", "gut health", "probiotic"],
  "Sleep, Stress & Relaxation": ["sleep", "stress relief", "relaxation"], "Women's Health": ["women's health", "womens health"], "Men's Health": ["men's health", "mens health"],
  "Joint & Bone Health": ["joint health", "bone health"], "Brain & Cognitive Support": ["brain", "cognitive", "nootropic"], "Pain Relief & Recovery": ["pain relief", "recovery"],
  "First Aid & Medical Supplies": ["first aid", "medical supply"], "Health Monitoring Devices": ["blood pressure", "health monitor", "pulse oximeter"],
  "Baby Clothing": ["baby clothing", "baby clothes", "baby outfit"], "Kids' Clothing": ["kids clothing", "children's clothing", "girls dress", "boys shirt"], "Baby & Kids' Footwear": ["baby shoes", "kids shoes", "children's shoes"],
  "Diapers & Wipes": ["diaper", "baby wipe"], "Baby Bath & Skincare": ["baby bath", "baby skincare", "baby lotion"], "Baby Feeding & Nursing": ["baby bottle", "nursing", "breast pump", "baby feeding"],
  "Baby Food & Formula": ["baby food", "baby formula"], "Pacifiers & Teethers": ["pacifier", "teether"], "Car Seats & Baby Safety": ["car seat", "baby safety"], "Nursery & Baby Sleep": ["crib", "bassinet", "nursery"],
  "Figures & Figurines": ["figure", "figurine"], "Dolls & Doll Accessories": ["doll"], "Plush Toys & Stuffed Animals": ["plush", "stuffed animal"], "Building Blocks & Construction Toys": ["building block", "construction toy"],
  "Educational & STEM Toys": ["educational toy", "stem toy"], "Card Games & Trading Cards": ["card game", "trading card"], "Puzzles & Brain Teasers": ["puzzle", "brain teaser"],
  "Blind Boxes & Mystery Collectibles": ["blind box", "mystery box"], "Anime & Pop Culture Collectibles": ["anime", "pop culture collectible"], "Sports Collectibles & Memorabilia": ["sports collectible", "sports memorabilia"],
  "Fidget & Sensory Toys": ["fidget", "sensory toy"], "Arts & Crafts Kits": ["craft kit", "art kit"],
  "Anklets & Body Jewelry": ["anklet", "body jewelry"], "Hair Accessories": ["hair accessory", "hair clip", "headband"], "Watches": ["watch", "timepiece"],
  "Power Tools": ["power tool", "drill", "power saw"], "Hand Tools & Tool Kits": ["hand tool", "tool kit"], "Tool Accessories & Attachments": ["tool accessory", "tool attachment"],
  "Measuring & Layout Tools": ["measuring tool", "tape measure", "laser level"], "Hardware & Repair Supplies": ["hardware", "repair supply"], "Electrical Supplies": ["electrical supply", "electrical wire"],
  "Doors, Windows & Hardware": ["door hardware", "window hardware"], "Ladders & Scaffolding": ["ladder", "scaffold"], "Safety & Protective Equipment": ["safety equipment", "protective equipment"],
  "Luggage & Suitcases": ["luggage", "suitcase"], "Duffel & Weekender Bags": ["duffel", "weekender bag"], "Packing & Organization": ["packing cube", "packing organizer"],
  "Travel Comfort": ["travel pillow", "travel blanket", "travel comfort"], "Travel Safety & Security": ["luggage lock", "travel safety", "travel security"], "Travel Bags & Organizers": ["travel bag", "travel organizer"],
  "Fiction Books": ["fiction book", "novel"], "Nonfiction Books": ["nonfiction", "non-fiction"], "Children's Books": ["children's book", "kids book"], "Educational & Academic Books": ["textbook", "academic book", "educational book"],
  "Self-Help & Personal Development": ["self help", "personal development"], "Religious & Spiritual Books": ["religious book", "spiritual book", "bible"], "Comics, Manga & Graphic Novels": ["comic", "manga", "graphic novel"],
  "Coloring & Activity Books": ["coloring book", "activity book"], "Stationery, Journals & Planners": ["stationery", "journal", "planner"], "Music & Vinyl Records": ["vinyl", "music record", "album"],
};

const stopWords = new Set(["and", "the", "for", "with", "accessories", "supplies", "equipment", "devices", "products"]);
const normalized = (value) => ` ${value.toLowerCase().normalize("NFKD").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
const bucketTerms = (bucket) => aliases[bucket] ?? bucket.toLowerCase().split(/\s*&\s*|\s+/).map((term) => term.replace(/[’']/g, "").replace(/s$/, "")).filter((term) => term.length >= 4 && !stopWords.has(term));
const configs = markets.flatMap((market) => market.buckets.map((bucket) => ({ market: market.name, bucket, terms: bucketTerms(bucket).map(normalized) })));
const results = Object.fromEntries(configs.map(({ bucket }) => [bucket, []]));
const shopRows = database.prepare("SELECT shop_id, category_ids FROM shops").all();
const categoriesByShop = new Map(shopRows.map((row) => [String(row.shop_id), String(row.category_ids ?? "").split("|")]));
const entries = fs.readdirSync(crawlRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());

function collectProducts(value, output = []) {
  if (!value || typeof value !== "object") return output;
  if (!Array.isArray(value) && value.product_id && value.title && value.image?.url_list?.[0]) output.push(value);
  for (const nested of Object.values(value)) collectProducts(nested, output);
  return output;
}

let processed = 0;
for (const entry of entries) {
  const shopId = entry.name;
  const shopCategoryIds = categoriesByShop.get(shopId) ?? [];
  const eligible = configs.filter(({ market, bucket }) => results[bucket].length < 30 && marketCategoryIds[market]?.some((id) => shopCategoryIds.includes(id)));
  if (!eligible.length) continue;
  const source = path.join(crawlRoot, shopId, "parsed", "modern-router-data.json");
  if (!fs.existsSync(source)) continue;
  let payload;
  try { payload = JSON.parse(fs.readFileSync(source, "utf8")); } catch { continue; }
  const products = [...new Map(collectProducts(payload).map((product) => [String(product.product_id), product])).values()];
  for (const product of products) {
    const title = normalized(String(product.title));
    for (const config of eligible) {
      if (results[config.bucket].length >= 30 || !config.terms.some((term) => title.includes(term))) continue;
      if (results[config.bucket].some((item) => item.shopId === shopId)) continue;
      results[config.bucket].push({ shopId, productId: String(product.product_id), title: String(product.title), imageUrl: String(product.image.url_list[0]), score: relevanceScore(config, title) });
    }
  }
  processed += 1;
  if (processed % 5000 === 0) process.stdout.write(`processed=${processed} complete=${Object.values(results).filter((items) => items.length >= 4).length}/${configs.length}\n`);
}

function relevanceScore(config, title) {
  const positions = config.terms.map((term) => title.indexOf(term)).filter((position) => position >= 0);
  const earliest = Math.min(...positions);
  const longest = Math.max(...config.terms.filter((term) => title.includes(term)).map((term) => term.trim().length));
  const exactPhrase = title.includes(normalized(config.bucket)) ? 500 : 0;
  return exactPhrase + Math.max(0, 700 - earliest * 3) + longest * 12 + Math.max(0, 220 - title.length);
}

const complete = Object.fromEntries(Object.entries(results).filter(([, items]) => items.length >= 4).map(([bucket, items]) => [bucket, items.sort((a, b) => b.score - a.score).slice(0, 4).map(({ score, ...item }) => item)]));
fs.writeFileSync(path.join(process.cwd(), "data/heatmap-product-images.json"), `${JSON.stringify(complete, null, 2)}\n`);
const missing = configs.map(({ bucket }) => bucket).filter((bucket) => !complete[bucket]);
console.log(JSON.stringify({ scannedShops: processed, complete: Object.keys(complete).length, total: configs.length, missing }, null, 2));
