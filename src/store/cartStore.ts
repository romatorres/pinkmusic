import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PackageSize } from "@/lib/types";

// Ordem de tamanho para calcular o maior porte do carrinho
const PACKAGE_SIZE_ORDER: Record<PackageSize, number> = {
  SMALL: 1,
  MEDIUM: 2,
  LARGE: 3,
  XLARGE: 4,
};

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  thumbnail: string;
  code?: string | null;
  packageSize: PackageSize;
  availableQuantity: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;

  // Ações
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Seletores computados
  itemsCount: () => number;
  subtotal: () => number;
  consolidatedPackageSize: () => PackageSize;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item, quantity = 1) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId
        );

        if (existingIndex >= 0) {
          // Produto já existe: incrementa, respeitando estoque
          const existing = items[existingIndex];
          const newQty = Math.min(
            existing.quantity + quantity,
            item.availableQuantity
          );
          const updated = [...items];
          updated[existingIndex] = { ...existing, quantity: newQty };
          set({ items: updated, isOpen: true });
        } else {
          // Novo produto
          const newQty = Math.min(quantity, item.availableQuantity);
          set({ items: [...items, { ...item, quantity: newQty }], isOpen: true });
        }
      },

      updateQuantity: (productId, quantity) => {
        const { items } = get();
        const item = items.find((i) => i.productId === productId);
        if (!item) return;

        if (quantity <= 0) {
          set({ items: items.filter((i) => i.productId !== productId) });
          return;
        }

        const validQty = Math.min(quantity, item.availableQuantity);
        set({
          items: items.map((i) =>
            i.productId === productId ? { ...i, quantity: validQty } : i
          ),
        });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      clearCart: () => set({ items: [], isOpen: false }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      // Seletores
      itemsCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      consolidatedPackageSize: (): PackageSize => {
        const { items } = get();
        if (items.length === 0) return "SMALL";

        return items.reduce<PackageSize>((largest, item) => {
          const current = PACKAGE_SIZE_ORDER[item.packageSize] ?? 1;
          const max = PACKAGE_SIZE_ORDER[largest] ?? 1;
          return current > max ? item.packageSize : largest;
        }, "SMALL");
      },
    }),
    {
      name: "pinkmusic-cart",
      // Não persiste isOpen — carrinho fechado ao reabrir o site
      partialize: (state) => ({ items: state.items }),
    }
  )
);
