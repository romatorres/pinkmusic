"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { CartDrawer } from "./_components/CartDrawer";
import { CustomerAuthModal } from "./_components/CustomerAuthModal";
import { HeaderSearchBox } from "./HeaderSearchBox";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------
function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("w-32 md:w-40 lg:w-50 aspect-[240/70.5]", className)}>
      <Link href="/" className="relative block w-full h-full">
        <Image
          src="/img/logo-pink.svg"
          alt="Logo Pink Music"
          fill
          className="object-contain"
          priority
        />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CartButton — botão de carrinho com badge
// ---------------------------------------------------------------------------
function CartButton({
  count,
  onClick,
}: {
  count: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Carrinho${count > 0 ? `, ${count} itens` : ""}`}
      className="relative grid size-11 place-items-center rounded-lg hover:bg-secondary transition-colors cursor-pointer"
    >
      <ShoppingBag className="size-5" />
      {count > 0 && (
        <span
          key={count}
          className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground animate-in zoom-in-50"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// Mapeamento de imagens locais para as categorias principais
const CATEGORY_IMAGES: Record<string, string> = {
  baterias: "/img/categories/cat-baterias.jpg",
  cordas: "/img/categories/cat-cordas.jpg",
  "home-studio": "/img/categories/cat-studio.jpg",
  studio: "/img/categories/cat-studio.jpg",
  percussao: "/img/categories/cat-percussao.jpg",
  sopro: "/img/categories/cat-sopro.jpg",
  teclas: "/img/categories/cat-teclas.jpg",
  audio: "/img/categories/cat-audio.jpg",
  "áudio": "/img/categories/cat-audio.jpg",
};

function getCategoryThumbnail(name: string): string | null {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  for (const [key, path] of Object.entries(CATEGORY_IMAGES)) {
    const normKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      return path;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// MegaMenu Desktop — grid de categorias com subcategorias em 1 linha
// ---------------------------------------------------------------------------
function MegaMenu({
  categories,
  onClose,
  menuRef,
}: {
  categories: Category[];
  onClose: () => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div
      ref={menuRef}
      className="absolute inset-x-0 top-full w-full border-b bg-card shadow-lift animate-in fade-in-0 slide-in-from-top-2 z-50 max-h-[calc(100vh-5rem)] overflow-y-auto"
    >
      <div className="container-page py-8">
        <div
          className="grid gap-x-6 gap-y-6"
          style={{
            gridTemplateColumns: `repeat(${Math.max(rootCategories.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {rootCategories.map((cat) => {
            const subs =
              cat.subcategories && cat.subcategories.length > 0
                ? cat.subcategories
                : [];

            return (
              <div key={cat.id} className="min-w-0">
                <Link
                  href={`/products-all?categoryIds=${cat.id}`}
                  onClick={onClose}
                  className="mb-3 block font-display text-sm font-extrabold uppercase tracking-wider text-primary hover:underline truncate"
                >
                  {cat.name}
                </Link>
                <ul className="space-y-1.5">
                  {subs.map((sub) => (
                    <li key={sub.id}>
                      <Link
                        href={`/products-all?categoryIds=${sub.id}`}
                        onClick={onClose}
                        className="block text-xs xl:text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
                      >
                        {sub.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Link geral */}
        <div className="border-t border-border/40 pt-4 mt-6">
          <Link
            href="/products-all"
            onClick={onClose}
            className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
          >
            Ver todas as categorias →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MobileMenu — Sheet com navegação em dois níveis e miniaturas de fotos
// ---------------------------------------------------------------------------
function MobileMenu({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: Category[];
}) {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const rootCategories = categories.filter((c) => !c.parentId);

  useEffect(() => {
    if (!open) setTimeout(() => setActiveCategory(null), 300);
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[88vw] max-w-sm p-0 [&>button]:hidden">
        <SheetTitle className="sr-only">Menu</SheetTitle>

        {/* Cabeçalho do drawer */}
        <div className="flex h-14 items-center justify-between border-b px-3">
          {activeCategory ? (
            <button
              onClick={() => setActiveCategory(null)}
              className="flex h-11 items-center gap-1 font-semibold"
            >
              <ChevronLeft className="size-5" /> Voltar
            </button>
          ) : (
            <span className="px-2 font-display text-lg font-bold">Categorias</span>
          )}
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
            className="grid size-11 place-items-center"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-3.5rem)] pb-8">
          {!activeCategory ? (
            /* Nível 1: lista de categorias com miniatura */
            <ul key="root" className="animate-in fade-in-0 slide-in-from-left-4">
              {rootCategories.map((cat) => {
                const thumb = getCategoryThumbnail(cat.name);
                return (
                  <li key={cat.id}>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className="flex w-full items-center gap-3 border-b px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    >
                      {thumb ? (
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={thumb}
                            alt={cat.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary font-bold">
                          {cat.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="flex-1 text-base font-semibold">{cat.name}</span>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
              {/* Links extras */}
              <li className="grid gap-1 p-4 text-base">
                <Link
                  href="/#about"
                  onClick={() => onOpenChange(false)}
                  className="py-2 text-foreground hover:text-primary transition-colors"
                >
                  Sobre a Pink Music
                </Link>
                <Link
                  href="/meus-pedidos"
                  onClick={() => onOpenChange(false)}
                  className="py-2 text-foreground hover:text-primary transition-colors"
                >
                  Meus Pedidos
                </Link>
              </li>
            </ul>
          ) : (
            /* Nível 2: subcategorias da categoria ativa */
            <ul key={activeCategory.id} className="animate-in fade-in-0 slide-in-from-right-4">
              <li>
                <Link
                  href={`/products-all?categoryIds=${activeCategory.id}`}
                  onClick={() => onOpenChange(false)}
                  className="block border-b bg-secondary px-4 py-4 font-display text-lg font-bold text-secondary-foreground"
                >
                  Ver tudo em {activeCategory.name}
                </Link>
              </li>
              {(activeCategory.subcategories ?? []).map((sub) => (
                <li key={sub.id}>
                  <Link
                    href={`/products-all?categoryIds=${sub.id}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center justify-between border-b px-4 py-3.5 text-base hover:bg-muted/50 transition-colors"
                  >
                    {sub.name}
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// UserMenu — dropdown de usuário autenticado
// ---------------------------------------------------------------------------
function UserMenu({
  isAuth,
  userName,
  userEmail,
  userInitials,
  onUserClick,
  userMenuOpen,
  userMenuRef,
  onLogout,
  onMenuItemClick,
}: {
  isAuth: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userInitials: string;
  onUserClick?: () => void;
  userMenuOpen?: boolean;
  userMenuRef?: React.RefObject<HTMLDivElement | null>;
  onLogout?: () => void;
  onMenuItemClick?: () => void;
}) {
  return (
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={onUserClick}
        aria-label={isAuth ? `Olá, ${userName}` : "Entrar na conta"}
        className="flex h-11 items-center gap-2 rounded-lg px-3 hover:bg-secondary transition-colors cursor-pointer"
      >
        <span className="relative flex h-7 w-7 items-center justify-center rounded-full overflow-hidden">
          {isAuth && userName ? (
            <span className="flex h-full w-full items-center justify-center bg-primary text-[11px] font-bold text-primary-foreground">
              {userInitials || "U"}
            </span>
          ) : (
            <User className="size-5" />
          )}
        </span>
        {isAuth && userName && (
          <ChevronDown className="size-4 shrink-0" />
        )}
      </button>

      {isAuth && userMenuOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border/60 bg-popover shadow-lift animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {userEmail || "E-mail não disponível"}
            </p>
          </div>
          <div className="mx-2 h-px bg-border/90" />
          <div className="p-1.5 space-y-0.5">
            <Link
              href="/meus-pedidos"
              onClick={onMenuItemClick}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              <Package className="size-4 text-muted-foreground" />
              Meus Pedidos
            </Link>
            <button
              type="button"
              onClick={() => {
                onLogout?.();
                onMenuItemClick?.();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="size-4" />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeaderContent — lógica: fetch de categorias, auth, carrinho, busca
// ---------------------------------------------------------------------------
function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [categories, setCategories] = useState<Category[]>([]);
  const [mega, setMega] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const megaRef = useRef<HTMLDivElement | null>(null);
  const megaButtonRef = useRef<HTMLButtonElement | null>(null);

  const { itemsCount, toggleCart } = useCartStore();
  const { isAuth, user, logout } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const cartCount = itemsCount();

  // Fecha menus ao mudar de rota
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMega(false);
      setMobileMenu(false);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  // Carrega usuário autenticado
  useEffect(() => {
    const { setUser } = useAuthStore.getState();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
  }, []);

  // Carrega categorias
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        if (data.success) setCategories(data.data || []);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Fecha menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        megaRef.current &&
        !megaRef.current.contains(target) &&
        megaButtonRef.current &&
        !megaButtonRef.current.contains(target)
      ) {
        setMega(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      useCartStore.getState().clearCart();
      logout();
      setUserMenuOpen(false);
      router.replace("/");
      router.refresh();
    }
  };

  const handleSearch = useCallback(
    (value: string) => {
      const normalized = value.trim();
      const current = searchParams.get("search") || "";
      if (normalized === current) return;
      const params = new URLSearchParams(searchParams);
      if (normalized) {
        params.set("search", normalized);
      } else {
        params.delete("search");
      }
      const queryString = params.toString();
      router.push(queryString ? `/products-all?${queryString}` : "/products-all");
    },
    [router, searchParams]
  );

  const userInitials = user?.name
    ? user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "U"
    : "";

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        {/* ── Desktop ── */}
        <div className="container-page hidden h-20 items-center gap-6 lg:flex">
          <Logo />

          {/* Botão Categorias */}
          <button
            ref={megaButtonRef}
            type="button"
            onClick={() => setMega((m) => !m)}
            aria-expanded={mega}
            aria-haspopup="menu"
            className={cn(
              "flex h-11 items-center gap-2 rounded-lg px-4 font-semibold transition-colors cursor-pointer",
              mega
                ? "bg-primary text-primary-foreground"
                : "hover:bg-secondary"
            )}
          >
            <Grid3x3 className="size-4" />
            Categorias
            <ChevronDown
              className={cn("size-4 transition-transform duration-200", mega && "rotate-180")}
            />
          </button>

          {/* Busca */}
          <HeaderSearchBox
            className="flex-1"
            initialValue={searchParams.get("search") || ""}
            onSearch={handleSearch}
          />

          {/* Nav direita */}
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/#about"
              className="flex h-11 items-center gap-2 rounded-lg px-3 hover:bg-secondary transition-colors"
            >
              Sobre
            </Link>

            <UserMenu
              isAuth={isAuth}
              userName={user?.name || null}
              userEmail={user?.email || null}
              userInitials={userInitials}
              onUserClick={() => {
                if (isAuth) setUserMenuOpen((v) => !v);
                else setShowAuthModal(true);
              }}
              userMenuOpen={userMenuOpen}
              userMenuRef={userMenuRef}
              onLogout={handleLogout}
              onMenuItemClick={() => setUserMenuOpen(false)}
            />

            <CartButton count={cartCount} onClick={toggleCart} />
          </nav>
        </div>

        {/* MegaMenu Desktop de largura total */}
        {mega && categories.length > 0 && (
          <div className="hidden lg:block">
            <MegaMenu
              categories={categories}
              onClose={() => setMega(false)}
              menuRef={megaRef}
            />
          </div>
        )}

        {/* ── Mobile ── */}
        <div className="lg:hidden">
          <div className="flex h-14 items-center justify-between px-2">
            <button
              onClick={() => setMobileMenu(true)}
              aria-label="Abrir menu"
              className="grid size-11 place-items-center rounded-lg hover:bg-secondary transition-colors"
            >
              <Menu className="size-6" />
            </button>

            <Logo />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isAuth) setUserMenuOpen((v) => !v);
                  else setShowAuthModal(true);
                }}
                aria-label={isAuth ? `Olá, ${user?.name}` : "Entrar"}
                className="grid size-11 place-items-center rounded-lg hover:bg-secondary transition-colors"
              >
                {isAuth && user?.name ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {userInitials || "U"}
                  </span>
                ) : (
                  <User className="size-5" />
                )}
              </button>
              <CartButton count={cartCount} onClick={toggleCart} />
            </div>
          </div>

          {/* Busca mobile */}
          <div className="px-3 pb-3">
            <HeaderSearchBox
              initialValue={searchParams.get("search") || ""}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </header>

      {/* Menu mobile drawer */}
      <MobileMenu
        open={mobileMenu}
        onOpenChange={setMobileMenu}
        categories={categories}
      />

      {/* CartDrawer global */}
      <CartDrawer />

      {/* Modal de autenticação */}
      <CustomerAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Export default com Suspense (necessário pelo useSearchParams)
// ---------------------------------------------------------------------------
export default function Header() {
  return (
    <Suspense
      fallback={
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
          <div className="container-page hidden h-20 items-center gap-6 lg:flex">
            <div className="w-32 md:w-40 lg:w-50 aspect-[240/70.5] bg-muted/40 rounded animate-pulse" />
          </div>
          <div className="lg:hidden h-14" />
        </header>
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
