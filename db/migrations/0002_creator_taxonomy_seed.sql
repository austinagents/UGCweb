INSERT INTO partnerlinks.commerce_categories (id, slug, display_name, parent_id, level, display_order) VALUES
  (1, 'sports-outdoors', 'Sports & Outdoors', NULL, 1, 1),
  (8, 'fashion', 'Fashion', NULL, 1, 2),
  (15, 'beauty-care', 'Beauty & Care', NULL, 1, 3),
  (22, 'food-beverage', 'Food & Beverage', NULL, 1, 4),
  (29, 'home-living', 'Home & Living', NULL, 1, 5),
  (36, 'pets-hobbies', 'Pets & Hobbies', NULL, 1, 6);

INSERT INTO partnerlinks.commerce_categories (id, slug, display_name, parent_id, level, display_order) VALUES
  (2, 'golf', 'Golf', 1, 2, 1),
  (3, 'pickleball', 'Pickleball', 1, 2, 2),
  (4, 'fitness', 'Fitness', 1, 2, 3),
  (5, 'running', 'Running', 1, 2, 4),
  (6, 'camping', 'Camping', 1, 2, 5),
  (7, 'fishing', 'Fishing', 1, 2, 6),
  (9, 'dresses', 'Dresses', 8, 2, 1),
  (10, 'activewear', 'Activewear', 8, 2, 2),
  (11, 'shoes', 'Shoes', 8, 2, 3),
  (12, 'jewelry', 'Jewelry', 8, 2, 4),
  (13, 'handbags', 'Handbags', 8, 2, 5),
  (14, 'menswear', 'Menswear', 8, 2, 6),
  (16, 'skincare', 'Skincare', 15, 2, 1),
  (17, 'makeup', 'Makeup', 15, 2, 2),
  (18, 'haircare', 'Haircare', 15, 2, 3),
  (19, 'fragrance', 'Fragrance', 15, 2, 4),
  (20, 'bodycare', 'Bodycare', 15, 2, 5),
  (21, 'nails', 'Nails', 15, 2, 6),
  (23, 'energy', 'Energy', 22, 2, 1),
  (24, 'snacks', 'Snacks', 22, 2, 2),
  (25, 'coffee', 'Coffee', 22, 2, 3),
  (26, 'protein', 'Protein', 22, 2, 4),
  (27, 'hydration', 'Hydration', 22, 2, 5),
  (28, 'candy', 'Candy', 22, 2, 6),
  (30, 'kitchen', 'Kitchen', 29, 2, 1),
  (31, 'cleaning', 'Cleaning', 29, 2, 2),
  (32, 'storage', 'Storage', 29, 2, 3),
  (33, 'decor', 'Decor', 29, 2, 4),
  (34, 'bedding', 'Bedding', 29, 2, 5),
  (35, 'bathroom', 'Bathroom', 29, 2, 6),
  (37, 'dogs', 'Dogs', 36, 2, 1),
  (38, 'cats', 'Cats', 36, 2, 2),
  (39, 'toys', 'Toys', 36, 2, 3),
  (40, 'collectibles', 'Collectibles', 36, 2, 4),
  (41, 'cards', 'Cards', 36, 2, 5),
  (42, 'crafts', 'Crafts', 36, 2, 6);

SELECT setval(
  pg_get_serial_sequence('partnerlinks.commerce_categories', 'id'),
  (SELECT max(id) FROM partnerlinks.commerce_categories)
);

INSERT INTO partnerlinks.tiktok_commerce_categories
  (market, external_category_id, name, parent_id)
VALUES
  ('US', '601450', 'Beauty & Personal Care', NULL),
  ('US', '600001', 'Home Supplies', NULL),
  ('US', '603014', 'Sports & Outdoor', NULL),
  ('US', '700437', 'Food & Beverages', NULL),
  ('US', '602118', 'Pet Supplies', NULL);

INSERT INTO partnerlinks.tiktok_commerce_categories
  (market, external_category_id, name, parent_id)
VALUES
  ('US', '848648', 'Makeup', (SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '601450')),
  ('US', '852104', 'Home Decor', (SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '600001')),
  ('US', '835336', 'Fitness', (SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '603014')),
  ('US', '915336', 'Snacks', (SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '700437')),
  ('US', '812168', 'Dog & Cat Food', (SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '602118'));

INSERT INTO partnerlinks.commerce_category_mappings
  (source_category_id, commerce_category_id, mapping_status, mapping_version, reason)
VALUES
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '601450'), 15, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '848648'), 17, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '600001'), 29, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '852104'), 33, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '603014'), 1, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '835336'), 4, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '700437'), 22, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '915336'), 24, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '602118'), 36, 'mapped', 1, NULL),
  ((SELECT id FROM partnerlinks.tiktok_commerce_categories WHERE market = 'US' AND external_category_id = '812168'), 36, 'parent_only', 1,
    'TikTok combines dogs and cats; do not infer Dogs or Cats membership.');

DO $$
DECLARE
  category_count integer;
  parent_count integer;
  child_count integer;
  invalid_pet_child_mappings integer;
BEGIN
  SELECT count(*) INTO category_count FROM partnerlinks.commerce_categories;
  SELECT count(*) INTO parent_count FROM partnerlinks.commerce_categories WHERE level = 1;
  SELECT count(*) INTO child_count FROM partnerlinks.commerce_categories WHERE level = 2;
  IF category_count <> 42 OR parent_count <> 6 OR child_count <> 36 THEN
    RAISE EXCEPTION 'Invalid PartnerLinks taxonomy: total %, parents %, children %', category_count, parent_count, child_count;
  END IF;

  SELECT count(*) INTO invalid_pet_child_mappings
  FROM partnerlinks.commerce_category_mappings mapping
  JOIN partnerlinks.tiktok_commerce_categories source ON source.id = mapping.source_category_id
  JOIN partnerlinks.commerce_categories target ON target.id = mapping.commerce_category_id
  WHERE source.external_category_id = '812168' AND target.slug IN ('dogs', 'cats');
  IF invalid_pet_child_mappings <> 0 THEN
    RAISE EXCEPTION 'Dog & Cat Food must not map to Dogs or Cats';
  END IF;
END $$;
