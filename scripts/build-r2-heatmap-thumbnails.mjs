import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = JSON.parse(await fs.readFile(path.join(process.cwd(), "data/heatmap-product-images.json"), "utf8"));
const outputRoot = path.resolve(process.cwd(), "../work/heatmap-product-thumbnails/v1");
const manifestPath = path.join(process.cwd(), "data/heatmap-product-images-r2.json");
const jobs = Object.entries(source).flatMap(([category, products]) => products.map((product, sortOrder) => ({ category, product, sortOrder })));
const manifest = {};

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function build({ category, product, sortOrder }) {
  const response = await fetch(product.imageUrl, { headers: { "user-agent": "Mozilla/5.0 PartnerLinks thumbnail archiver" } });
  if (!response.ok) throw new Error(`${response.status} ${category} ${product.productId}`);
  const input = Buffer.from(await response.arrayBuffer());
  const image = await sharp(input).resize(96, 96, { fit: "cover", position: "attention" }).webp({ quality: 76, effort: 4 }).toBuffer();
  const categorySlug = slug(category);
  const fileName = `${sortOrder}-${product.shopId}-${product.productId}.webp`;
  const relativePath = `${categorySlug}/${fileName}`;
  const storageKey = `heatmap/product-thumbnails/v1/${relativePath}`;
  const localPath = path.join(outputRoot, relativePath);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, image);
  const record = { ...product, category, categorySlug, sortOrder, storageKey, width: 96, height: 96, byteSize: image.length, sha256: crypto.createHash("sha256").update(image).digest("hex") };
  (manifest[category] ??= [])[sortOrder] = record;
}

let cursor = 0;
const errors = [];
await Promise.all(Array.from({ length: 12 }, async () => {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    try { await build(job); } catch (error) { errors.push({ category: job.category, productId: job.product.productId, error: String(error) }); }
  }
}));

if (errors.length) {
  console.error(JSON.stringify({ built: jobs.length - errors.length, errors }, null, 2));
  process.exitCode = 1;
} else {
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const bytes = Object.values(manifest).flat().reduce((sum, item) => sum + item.byteSize, 0);
  console.log(JSON.stringify({ thumbnails: jobs.length, categories: Object.keys(manifest).length, bytes, outputRoot, manifestPath }, null, 2));
}
