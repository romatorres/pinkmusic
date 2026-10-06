import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  thumbnail: string;
  code?: string | null;
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
    }),
    {
      name: "pinkmusic-cart",
      // Não persiste isOpen — carrinho fechado ao reabrir o site
      partialize: (state) => ({ items: state.items }),
    }
  )
);
