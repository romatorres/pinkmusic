export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  thumbnail: string;
  condition: string;
  brand: Brand;
  available_quantity: number;
  seller_nickname: string;
  permalink: string;
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
  _count?: {
    products: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
