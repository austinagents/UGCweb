import type { CategoryProductImage } from "@/lib/category-product-images";

export function ProductImageStack({ products }: { products: readonly CategoryProductImage[] }) {
  return <div className="productImageStack" aria-label={`${products.length} category products`}>
    {products.map((product) => <img src={product.imageUrl} alt={product.title} title={product.title} width={32} height={32} loading="lazy" key={product.productId} />)}
  </div>;
}
