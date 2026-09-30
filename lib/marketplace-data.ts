export const marketplaceCategories = ["All", "Fashion", "Food", "Sports", "Home", "Beauty", "Tech", "Pets", "Other"] as const;

export type MarketplaceCategory = typeof marketplaceCategories[number];

export type MarketplaceVariant = {
  sourceVariantId: string;
  name: string;
  externalProductId: string | null;
  imageUrl: string;
};

export type MarketplaceCreatorExample = {
  slot: number;
  mime: string;
  url: string;
};

export type MarketplaceListing = {
  source: {
    system: "discord-deals";
    productId: string;
  };
  product: {
    id: string;
    name: string;
    brand: string;
    category: string;
    imageUrl: string;
    description: string;
    brandWebsite: string | null;
  };
  offer: {
    commission: string;
    shopAds: string | null;
    freeSample: string;
    requirements: string;
    active: boolean;
    variantSelectionLimit: number;
    variants: MarketplaceVariant[];
    creatorExamples: MarketplaceCreatorExample[];
  };
};

/*
 * Read-only snapshot captured from the active marketplace public GET endpoint.
 * Product identity and offer terms are intentionally separated so the legacy
 * storage shape does not become the prototype's conceptual architecture.
 */
export const marketplaceListings: MarketplaceListing[] = [
  {
    "source": {
      "system": "discord-deals",
      "productId": "natural-banana-energy-gel"
    },
    "product": {
      "id": "natural-banana-energy-gel",
      "name": "Natural Banana Energy Gel",
      "brand": "VitalFuel",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/natural-banana-energy-gel/image",
      "description": "Over 12,000 sales on Amazon. Hundreds of Affiliate videos already made on Amazon and its doing well, now they're starting TikTok push. I'm running the TikTok Shop and will send you an auto-approved free sample invite.",
      "brandWebsite": "https://vitalfuelgel.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": [
        {
          "slot": 1,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/natural-banana-energy-gel/videos/1"
        },
        {
          "slot": 2,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/natural-banana-energy-gel/videos/2"
        },
        {
          "slot": 3,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/natural-banana-energy-gel/videos/3"
        },
        {
          "slot": 4,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/natural-banana-energy-gel/videos/4"
        }
      ]
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "cider-x-energy-drink-mixed-case-12-pack"
    },
    "product": {
      "id": "cider-x-energy-drink-mixed-case-12-pack",
      "name": "Cider X Energy, Mixed 12-Pack",
      "brand": "Life Cider",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/cider-x-energy-drink-mixed-case-12-pack/image",
      "description": "In Walmart nationwide! Apple cider vinegar - energy drink - New product drop.",
      "brandWebsite": "https://lifecider.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": [
        {
          "slot": 1,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/cider-x-energy-drink-mixed-case-12-pack/videos/1"
        },
        {
          "slot": 2,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/cider-x-energy-drink-mixed-case-12-pack/videos/2"
        },
        {
          "slot": 3,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/cider-x-energy-drink-mixed-case-12-pack/videos/3"
        },
        {
          "slot": 4,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/cider-x-energy-drink-mixed-case-12-pack/videos/4"
        }
      ]
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "poppong-golf-game"
    },
    "product": {
      "id": "poppong-golf-game",
      "name": "PopPong Golf Game",
      "brand": "BucketGolf",
      "category": "Sports",
      "imageUrl": "https://partnerlinks.app/api/products/poppong-golf-game/image",
      "description": "Went on Shark Tank and got a deal - Mark Cuban Official Investor - Backyard/Indoor Golf Game",
      "brandWebsite": "https://www.bucketgolfgame.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": [
        {
          "slot": 1,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/poppong-golf-game/videos/1"
        },
        {
          "slot": 2,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/poppong-golf-game/videos/2"
        },
        {
          "slot": 3,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/poppong-golf-game/videos/3"
        },
        {
          "slot": 4,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/poppong-golf-game/videos/4"
        }
      ]
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "wristband-bracelet-3-pack"
    },
    "product": {
      "id": "wristband-bracelet-3-pack",
      "name": "Wristband/Bracelet (3 Pack)",
      "brand": "Hang Loose Bands",
      "category": "Fashion",
      "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/image",
      "description": "23.7K Sales on TikTok Shop (Silver Star Seller)",
      "brandWebsite": "https://hangloosebands.com/"
    },
    "offer": {
      "commission": "20%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 3,
      "variants": [
        {
          "sourceVariantId": "13",
          "name": "Ridgeline",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/13/image"
        },
        {
          "sourceVariantId": "14",
          "name": "Seabreeze",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/14/image"
        },
        {
          "sourceVariantId": "15",
          "name": "Pink Camo",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/15/image"
        },
        {
          "sourceVariantId": "16",
          "name": "Palomino",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/16/image"
        },
        {
          "sourceVariantId": "17",
          "name": "Marlin",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/17/image"
        },
        {
          "sourceVariantId": "18",
          "name": "Funky Trout",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/18/image"
        },
        {
          "sourceVariantId": "19",
          "name": "Country Club",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/19/image"
        },
        {
          "sourceVariantId": "20",
          "name": "White Baseball",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/20/image"
        },
        {
          "sourceVariantId": "21",
          "name": "Black Baseball",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/21/image"
        },
        {
          "sourceVariantId": "22",
          "name": "Carp",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/22/image"
        },
        {
          "sourceVariantId": "23",
          "name": "Palms",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/23/image"
        },
        {
          "sourceVariantId": "24",
          "name": "Golden Hour",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/wristband-bracelet-3-pack/variants/24/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "golf-ball-tee-dispenser"
    },
    "product": {
      "id": "golf-ball-tee-dispenser",
      "name": "Golf Ball & Tee Dispenser",
      "brand": "Jittmer",
      "category": "Sports",
      "imageUrl": "https://partnerlinks.app/api/products/golf-ball-tee-dispenser/image",
      "description": "They just had a solid little raise on Kickstarter with lot of people backing it, cool golf product and unique @everyone \r\n\r\nThen they had an angel-raise round right after. Last month they launched on Shopify and have ~200K in sales already. Now they're moving to TikTok. I'm running the TikTok Shop and will send you an auto-approved free sample invite.",
      "brandWebsite": "https://jittmer.com/"
    },
    "offer": {
      "commission": "13%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "12-softball-impact-activated"
    },
    "product": {
      "id": "12-softball-impact-activated",
      "name": "12” Softball (Impact-Activated)",
      "brand": "Spark Catch",
      "category": "Sports",
      "imageUrl": "https://partnerlinks.app/api/products/12-softball-impact-activated/image",
      "description": "Over 3000 sales on tiktok shop. Fun thing that anyone can promote. I'm running the affiliate center and will send you an auto-approved free sample invite.",
      "brandWebsite": "https://www.sparkcatch.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "4-pack-foam-baseball"
    },
    "product": {
      "id": "4-pack-foam-baseball",
      "name": "4 Pack - Foam Baseball",
      "brand": "Borgoball",
      "category": "Sports",
      "imageUrl": "https://partnerlinks.app/api/products/4-pack-foam-baseball/image",
      "description": "Over 5000 sales on TikTok Shop. \"Foam Baseball with Crazy Movement for Indoor Fun\". High proof of sales with affiliates on TikTok Shop.",
      "brandWebsite": "https://borgosports.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "3%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "pup-cup-dog-toy"
    },
    "product": {
      "id": "pup-cup-dog-toy",
      "name": "\"Pup Cup\" Dog Toy",
      "brand": "Nestpark",
      "category": "Pets",
      "imageUrl": "https://partnerlinks.app/api/products/pup-cup-dog-toy/image",
      "description": "Nestpark has over 200K units sold on Amazon. Now making a TikTok push for the Star Pups \"pup cup\" dog toy.",
      "brandWebsite": null
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "cold-brew-coffee-6-pack"
    },
    "product": {
      "id": "cold-brew-coffee-6-pack",
      "name": "Cold Brew Coffee (6-pack)",
      "brand": "RICA",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/cold-brew-coffee-6-pack/image",
      "description": "Ready To Drink Black Cold Brew Coffee With 250mg Natural Caffeine | 5 calories per can",
      "brandWebsite": "https://ricacoldbrew.com/"
    },
    "offer": {
      "commission": "30%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "massage-tool"
    },
    "product": {
      "id": "massage-tool",
      "name": "Massage Tool",
      "brand": "Fascia Sticks",
      "category": "Beauty",
      "imageUrl": "https://partnerlinks.app/api/products/massage-tool/image",
      "description": "This ones picking up steam. Over 500 sales on TikTok Shop, great reviews, and relatively new. I'm running the TikTok Shop and will send you an auto-approved free sample invite.",
      "brandWebsite": "https://fasciasticks.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "artisan-hot-sauces"
    },
    "product": {
      "id": "artisan-hot-sauces",
      "name": "Artisan Hot Sauces",
      "brand": "Two Heads",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/image",
      "description": "Just got into their first major retail. Won a bunch of local awards. Gluten Free, Low Sodium, No sugar added. More options available in (Open Creator Deals)",
      "brandWebsite": "https://www.twoheadsheat.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 3,
      "variants": [
        {
          "sourceVariantId": "25",
          "name": "Raspberry Chipotle",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/25/image"
        },
        {
          "sourceVariantId": "26",
          "name": "Poblano & Serrano",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/26/image"
        },
        {
          "sourceVariantId": "27",
          "name": "Music City Heat",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/27/image"
        },
        {
          "sourceVariantId": "28",
          "name": "Hot Honey",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/28/image"
        },
        {
          "sourceVariantId": "29",
          "name": "Blackberry Jalapeno",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/29/image"
        },
        {
          "sourceVariantId": "30",
          "name": "Strawberry Serrano",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/30/image"
        },
        {
          "sourceVariantId": "31",
          "name": "Tri-Star Scorpanero",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/31/image"
        },
        {
          "sourceVariantId": "32",
          "name": "Peach Serrano",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/artisan-hot-sauces/variants/32/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "invisible-sunscreen"
    },
    "product": {
      "id": "invisible-sunscreen",
      "name": "Invisible Sunscreen",
      "brand": "Not There SPF",
      "category": "Beauty",
      "imageUrl": "https://partnerlinks.app/api/products/invisible-sunscreen/image",
      "description": "Subsidiary of a major global conglomerate.",
      "brandWebsite": null
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "4-flavor-mix-pack"
    },
    "product": {
      "id": "4-flavor-mix-pack",
      "name": "(4-Flavor) Mix Pack",
      "brand": "Mis Rubins",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/4-flavor-mix-pack/image",
      "description": "Established brand with large retail partnerships across hundreds of Publix and Winn-Dixie locations. I'm running the TikTok Shop and will send you an auto-approved free sample invite.",
      "brandWebsite": "https://misrubins.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "peach-mango-energy-drink-12-pack"
    },
    "product": {
      "id": "peach-mango-energy-drink-12-pack",
      "name": "Peach Mango Energy Drink (12-Pack)",
      "brand": "OASIS",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/peach-mango-energy-drink-12-pack/image",
      "description": "Seeking a healthier option, Oasis brought the Amazonian “Super Leaf” Guayusa to an Energy Drink. Guayusa is a nootropic that provides balanced energy, enhances focus, and supports mental clarity without jitters or crashes.",
      "brandWebsite": "https://oasisenergydrink.com/"
    },
    "offer": {
      "commission": "16.5%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "hooks-ring-toss-game"
    },
    "product": {
      "id": "hooks-ring-toss-game",
      "name": "HOOKS Ring Toss Game",
      "brand": "CRAGGY",
      "category": "Other",
      "imageUrl": "https://partnerlinks.app/api/products/hooks-ring-toss-game/image",
      "description": "HOOKS! is a fast-paced ring toss game where you try to land your rings as quickly as possible. Over 1500 Sales on TikTok Shop.",
      "brandWebsite": "https://craggygames.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "apparel"
    },
    "product": {
      "id": "apparel",
      "name": "Apparel",
      "brand": "SMACK",
      "category": "Fashion",
      "imageUrl": "https://partnerlinks.app/api/products/apparel/image",
      "description": "Smack Apparel creates high quality sports apparel inspired by the rivalries and traditions. Quick Request for random pick | Check (Open Creator Deals) for more options.",
      "brandWebsite": "https://www.smackapparel.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [
        {
          "sourceVariantId": "56",
          "name": "Miami (Anti-FSU)",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/56/image"
        },
        {
          "sourceVariantId": "57",
          "name": "FSU (Anti-Miami)",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/57/image"
        },
        {
          "sourceVariantId": "58",
          "name": "Buffalo V-neck",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/58/image"
        },
        {
          "sourceVariantId": "59",
          "name": "Notre Dame V-neck",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/59/image"
        },
        {
          "sourceVariantId": "60",
          "name": "Notre Dame",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/60/image"
        },
        {
          "sourceVariantId": "61",
          "name": "Iowa",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/61/image"
        },
        {
          "sourceVariantId": "62",
          "name": "Michigan (Anti-Ohio)",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/apparel/variants/62/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "35-nasal-strips-35-mouth-tape"
    },
    "product": {
      "id": "35-nasal-strips-35-mouth-tape",
      "name": "(35 NASAL STRIPS + 35 MOUTH TAPE)",
      "brand": "SLYD STRIPS",
      "category": "Beauty",
      "imageUrl": "https://partnerlinks.app/api/products/35-nasal-strips-35-mouth-tape/image",
      "description": "The Ultimate Recovery Kit pairs premium nasal strips with mouth tape to optimize airflow and support better breathing. Designed for enhanced sleep, performance, and recovery.",
      "brandWebsite": "https://www.slydstrips.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "shilajit-supplement"
    },
    "product": {
      "id": "shilajit-supplement",
      "name": "Shilajit Supplement",
      "brand": "Provibelife",
      "category": "Other",
      "imageUrl": "https://partnerlinks.app/api/products/shilajit-supplement/image",
      "description": "Supports natural energy, stamina, recovery, and overall vitality with fulvic acid and 84+ minerals. 60 Tablets of \"Pure Mountain Resin\".",
      "brandWebsite": "https://provibelife.com/products/shilajit-tablets"
    },
    "offer": {
      "commission": "25%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "three-natural-artesian-soap-bars"
    },
    "product": {
      "id": "three-natural-artesian-soap-bars",
      "name": "Three Natural Artesian Soap Bars",
      "brand": "Bootlegger",
      "category": "Beauty",
      "imageUrl": "https://partnerlinks.app/api/products/three-natural-artesian-soap-bars/image",
      "description": "Barnstormer - Crisp and oceanic with a blast of sea salt freshness. Roadhouse - Sandalwood and activated charcoal for a deep, earthy detox. Speakeasy - Smooth lavender for relaxing.",
      "brandWebsite": "https://bootleggersoap.com"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "pilates-socks"
    },
    "product": {
      "id": "pilates-socks",
      "name": "Pilates Socks",
      "brand": "Solabide",
      "category": "Fashion",
      "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/image",
      "description": "Solabide makes stylish grip socks designed for Pilates, workouts, and everyday movement. Each pair combines comfort and function with uplifting messages and thoughtful designs.",
      "brandWebsite": "https://www.solabide.com/"
    },
    "offer": {
      "commission": "5%",
      "shopAds": "15%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [
        {
          "sourceVariantId": "51",
          "name": "Rooted in Love",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/variants/51/image"
        },
        {
          "sourceVariantId": "52",
          "name": "Faith Can Move Mountains",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/variants/52/image"
        },
        {
          "sourceVariantId": "53",
          "name": "Philippians 4:13",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/variants/53/image"
        },
        {
          "sourceVariantId": "54",
          "name": "Proverbs 31:25",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/variants/54/image"
        },
        {
          "sourceVariantId": "55",
          "name": "Psalm 46:5",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/pilates-socks/variants/55/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "premium-brisket-beef-jerky"
    },
    "product": {
      "id": "premium-brisket-beef-jerky",
      "name": "Premium Brisket Beef Jerky",
      "brand": "Yoked",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/image",
      "description": "Yoked makes premium brisket beef jerky with a focus on unique flavors and high-quality ingredients. Their lineup has flavors like Carne Asada, Honey Peppercorn, Taste of Seoul, and Reaper’s Wrath. Select 2 from creator deals or quick request for random.",
      "brandWebsite": "https://yokedjerky.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 2,
      "variants": [
        {
          "sourceVariantId": "43",
          "name": "Carne Asada",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/43/image"
        },
        {
          "sourceVariantId": "44",
          "name": "The Standard",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/44/image"
        },
        {
          "sourceVariantId": "45",
          "name": "Honey Peppercorn",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/45/image"
        },
        {
          "sourceVariantId": "46",
          "name": "Roasted Garlic",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/46/image"
        },
        {
          "sourceVariantId": "47",
          "name": "Pitmaster's Reserve",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/47/image"
        },
        {
          "sourceVariantId": "48",
          "name": "Reaper's Wrath",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/48/image"
        },
        {
          "sourceVariantId": "49",
          "name": "Korean BBQ",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/49/image"
        },
        {
          "sourceVariantId": "50",
          "name": "Western Teriyaki",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/premium-brisket-beef-jerky/variants/50/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "limited-edition-cap"
    },
    "product": {
      "id": "limited-edition-cap",
      "name": "Limited Edition Cap",
      "brand": "Aska",
      "category": "Fashion",
      "imageUrl": "https://partnerlinks.app/api/products/limited-edition-cap/image",
      "description": "Aska Limited is an apparel brand focused on classic, sport-inspired clothing and accessories with a clean aesthetic. The brand releases products in limited “Issues,” including pieces like its Founder’s Cap.",
      "brandWebsite": "https://askalmtd.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "mens-apparel"
    },
    "product": {
      "id": "mens-apparel",
      "name": "Mens Apparel",
      "brand": "RYVT",
      "category": "Fashion",
      "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/image",
      "description": "Men’s apparel for the whole day. Athletic fits, heavyweight tees, and everyday layers. Fewer pieces. More purpose. Nothing added without a reason.",
      "brandWebsite": "https://wearryvt.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [
        {
          "sourceVariantId": "38",
          "name": "Heavyweight Tee",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/variants/38/image"
        },
        {
          "sourceVariantId": "39",
          "name": "Leather Cardholder",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/variants/39/image"
        },
        {
          "sourceVariantId": "40",
          "name": "Executive Polo",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/variants/40/image"
        },
        {
          "sourceVariantId": "41",
          "name": "Cuffed Joggers",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/variants/41/image"
        },
        {
          "sourceVariantId": "42",
          "name": "Premium Fitted Tank",
          "externalProductId": null,
          "imageUrl": "https://partnerlinks.app/api/products/mens-apparel/variants/42/image"
        }
      ],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "nootropic-energy-drink-mix"
    },
    "product": {
      "id": "nootropic-energy-drink-mix",
      "name": "Nootropic Energy & Drink Mix",
      "brand": "START",
      "category": "Food",
      "imageUrl": "https://partnerlinks.app/api/products/nootropic-energy-drink-mix/image",
      "description": "5g Creatine, 200mg Caffeine, L-Theanine, Alpha-GPC & Rhodiola - Focus, Mood, Hydration, Stress & Cognitive all in one mix - 15 Active Ingredients - 14 Servings",
      "brandWebsite": "https://drinkstartstop.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "pickleball-grip"
    },
    "product": {
      "id": "pickleball-grip",
      "name": "Pickleball Grip",
      "brand": "Hesacore",
      "category": "Sports",
      "imageUrl": "https://partnerlinks.app/api/products/pickleball-grip/image",
      "description": "Grips consistently perform well on TikTok Shop across nearly every sport that uses them. Pickleball Grips are still kind of untapped.",
      "brandWebsite": "https://shop.hesacore.com/products/pickleball-hesacore-tour-grip"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": [
        {
          "slot": 1,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/pickleball-grip/videos/1"
        },
        {
          "slot": 2,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/pickleball-grip/videos/2"
        },
        {
          "slot": 3,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/pickleball-grip/videos/3"
        },
        {
          "slot": 4,
          "mime": "video/mp4",
          "url": "https://partnerlinks.app/api/products/pickleball-grip/videos/4"
        }
      ]
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "heated-eye-mask"
    },
    "product": {
      "id": "heated-eye-mask",
      "name": "Heated Eye Mask",
      "brand": "BAPPIES",
      "category": "Beauty",
      "imageUrl": "https://partnerlinks.app/api/products/heated-eye-mask/image",
      "description": "A rechargeable heated eye mask with three heat settings to help with dry eyes, eye strain, headaches, and overall relaxation.",
      "brandWebsite": "https://www.bappies.com/products/heated-eye-mask"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  },
  {
    "source": {
      "system": "discord-deals",
      "productId": "square-downspout-protector"
    },
    "product": {
      "id": "square-downspout-protector",
      "name": "Square Downspout Protector",
      "brand": "GutterGate",
      "category": "Home",
      "imageUrl": "https://partnerlinks.app/api/products/square-downspout-protector/image",
      "description": "Gatekeeper to your gutters and downspouts | Controls Water Flow | Designed to handle heavy rainfall while preventing flooding and soil erosion.",
      "brandWebsite": "https://guttergate.com/"
    },
    "offer": {
      "commission": "15%",
      "shopAds": "5%",
      "freeSample": "Auto-Approved",
      "requirements": "1 TikTok Shoppable Video",
      "active": true,
      "variantSelectionLimit": 1,
      "variants": [],
      "creatorExamples": []
    }
  }
];

export function marketplaceListing(id: string) {
  return marketplaceListings.find((listing) => listing.product.id === id);
}

export function cleanMarketplaceDescription(description: string) {
  return description
    .replace(/@everyone/gi, "")
    .replace(/\s*\|?\s*Quick Request[^.]*\.?/gi, "")
    .replace(/\s*\|?\s*Check \(Open Creator Deals\)[^.]*\.?/gi, "")
    .replace(/\s*More options available in \(Open Creator Deals\)\.?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

