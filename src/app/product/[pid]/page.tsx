import { ProductShopView } from "@/features/product/components/product-shop-view";

type Props = { params: Promise<{ pid: string }> };

export function generateStaticParams() {
  return [];
}

export default async function ProductPage({ params }: Props) {
  const { pid } = await params;
  return <ProductShopView pid={pid} />;
}
