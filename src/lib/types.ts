export interface Category {
  id: string;
  name: string;
  slug?: string | null;
  parentId?: string | null;
  parent?: Category | null;
  subcategories?: Category[];
  products?: { brandId: string | null }[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProductOrigin = "MERCADO_LIVRE" | "LOCAL";

export interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  brand: Brand;
  brandId?: string;
  category?: Category;
  categoryId?: string;
  available_quantity: number;
  seller_nickname: string;
  permalink?: string | null;
  origin?: ProductOrigin;
  description?: string | null;
  isLocalPickup?: boolean;
  sales?: number;
  pictures: { id: string; url: string; secure_url: string }[];
  attributes?: { id: string; name: string; value_name: string }[];
}

export interface ProductDetailsProps {
  product: Product;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  products?: { categoryId: string | null }[];
  _count?: {
    products: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
