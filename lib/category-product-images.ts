import productImageIndex from "@/data/heatmap-product-images.json";

export type CategoryProductImage = {
  shopId: string;
  productId: string;
  title: string;
  imageUrl: string;
};

const categoryProductImages = productImageIndex as Record<string, CategoryProductImage[]>;

export function productImagesForCategory(category: string) {
  const images = categoryProductImages[category] ?? [];
  const distinctStores = images.filter((product, index) => images.findIndex((candidate) => candidate.shopId === product.shopId) === index);
  return distinctStores.length >= 4 ? distinctStores.slice(0, 4) : [];
}
