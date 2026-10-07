import { ProductShopView } from "@/features/product/components/product-shop-view";

type Props = { params: Promise<{ pid: string }> };

export default async function ProductPage({ params }: Props) {
  const { pid } = await params;
  return <ProductShopView pid={pid} />;
}
