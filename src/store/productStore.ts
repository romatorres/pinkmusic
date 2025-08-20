import { create } from 'zustand';
import { Product } from '@/lib/types';

interface ProductState {
  products: Product[];
  setProducts: (products: Product[]) => void;
  updateProduct: (updatedProduct: Product) => void;
  getProductById: (id: string) => Product | undefined;
}

export const useProductStore = create<ProductState>((set, get) => ({
  // Estado inicial
  products: [],

  // Ação para definir a lista inteira de produtos (ex: no primeiro carregamento)
  setProducts: (products) => set({ products }),

  // Ação para atualizar um único produto na lista
  updateProduct: (updatedProduct) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p
      ),
    })),

  // Ação para limpar o array de produtos
  resetProducts: () => set({ products: [] }),

  // Ação para buscar um produto pelo ID diretamente do store
  getProductById: (id: string) => {
    return get().products.find((p) => p.id === id);
  },
}));
