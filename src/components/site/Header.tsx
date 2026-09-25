"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChevronDown,
  ChevronRight,
  MenuIcon,
  ShoppingCart,
  User,
  LogOut,
  Package,
} from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Social from "./_components/Social";
import { SearchInput } from "@/components/ui/SearchInput";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { CartDrawer } from "./_components/CartDrawer";
import { CustomerAuthModal } from "./_components/CustomerAuthModal";

function DesktopCategoryMegaMenu({
  categories,
  onClose,
}: {
  categories: Category[];
  onClose: () => void;
}) {
  const rootCategories = categories.filter((c) => !c.parentId);
  const childCategories = categories.filter((c) => !!c.parentId);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    rootCategories[0]?.id || "",
  );

  const activeCategory =
    rootCategories.find((c) => c.id === activeCategoryId) || rootCategories[0];

  const activeSubcategories = activeCategory
    ? activeCategory.subcategories && activeCategory.subcategories.length > 0
      ? activeCategory.subcategories
      : childCategories.filter((c) => c.parentId === activeCategory.id)
    : [];

  return (
    <div className="absolute right-0 top-full z-30 mt-3 w-[500px] md:w-[540px] rounded-2xl border border-border/60 bg-white p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="grid grid-cols-12 gap-3 min-h-[300px]">
        {/* Coluna da Esquerda: Categorias Principais */}
        <div className="col-span-5 border-r border-border/40 pr-2 space-y-1 overflow-y-auto max-h-[380px] [scrollbar-width:none]">
          <Link
            href="/products-all"
            onClick={onClose}
            className="mb-2 block rounded-xl px-3 py-2 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            Todas as categorias →
          </Link>

          {rootCategories.map((cat) => {
            const isHovered =
              cat.id === (activeCategory?.id || activeCategoryId);
            const subCount =
              cat.subcategories && cat.subcategories.length > 0
                ? cat.subcategories.length
                : childCategories.filter((c) => c.parentId === cat.id).length;

            return (
              <div
                key={cat.id}
                onMouseEnter={() => setActiveCategoryId(cat.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium cursor-pointer transition-all",
                  isHovered
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-foreground hover:bg-muted/70",
                )}
              >
                <Link
                  href={`/products-all?categoryIds=${cat.id}`}
                  onClick={onClose}
                  className="flex-1 truncate mr-1"
                >
                  {cat.name}
                </Link>
                {subCount > 0 && (
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 flex-shrink-0 transition-transform",
                      isHovered
                        ? "text-primary-foreground translate-x-0.5"
                        : "text-muted-foreground/60",
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Coluna da Direita: Subcategorias */}
        <div className="col-span-7 pl-1 flex flex-col justify-between max-h-[380px]">
          <div className="space-y-2 overflow-y-auto pr-1 max-h-[370px] [scrollbar-width:none]">
            {activeCategory && (
              <div className="border-b border-border/40 pb-2 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-primary tracking-wide uppercase truncate max-w-[180px]">
                  {activeCategory.name}
                </span>
                <Link
                  href={`/products-all?categoryIds=${activeCategory.id}`}
                  onClick={onClose}
                  className="text-[11px] font-medium text-primary/70 hover:text-primary underline flex-shrink-0"
                >
                  Ver todos
                </Link>
              </div>
            )}

            {activeSubcategories.length > 0 ? (
              <div
                className={cn(
                  "grid gap-1",
                  activeSubcategories.length > 6
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {activeSubcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/products-all?categoryIds=${sub.id}`}
                    onClick={onClose}
                    className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-foreground transition-all hover:bg-primary/5 hover:text-primary font-normal"
                  >
                    <span className="truncate">{sub.name}</span>
                    <ChevronRight className="h-3 w-3 flex-shrink-0 text-transparent group-hover:text-primary transition-colors" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhuma subcategoria para{" "}
                {activeCategory?.name || "esta categoria"}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeaderLayout({
  inputValue,
  setInputValue,
  onSearch,
  isHomePage,
  categories,
  categoriesOpen,
  setCategoriesOpen,
  categoryMenuRef,
  cartCount = 0,
  onCartClick,
  isAuth = false,
  userName = null,
  userEmail = null,
  userInitials = "",
  onUserClick,
  userMenuOpen = false,
  userMenuRef,
  onLogout,
  onMenuItemClick,
}: {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSearch: (value: string) => void;
  isHomePage: boolean;
  categories: Category[];
  categoriesOpen: boolean;
  setCategoriesOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  categoryMenuRef: React.RefObject<HTMLDivElement | null>;
  cartCount?: number;
  onCartClick?: () => void;
  isAuth?: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userInitials?: string;
  onUserClick?: () => void;
  userMenuOpen?: boolean;
  userMenuRef?: React.RefObject<HTMLDivElement | null>;
  onLogout?: () => void;
  onMenuItemClick?: () => void;
}) {
  return (
    <header
      className={cn(
        "left-0 right-0 z-10 flex min-h-[100px] w-full items-center justify-center py-3 md:min-h-[124px]",
        isHomePage ? "absolute top-6" : "relative top-0",
      )}
    >
      <PageContainer>
        <div className="flex h-[70px] w-full items-center justify-between">
          {/* Logo */}
          <div className="relative w-[170px] md:w-[200px] lg:w-[240px] aspect-[240/70.5]">
            <Link href="/">
              <Image
                src="/img/logo-pink.svg"
                alt="Logo da empresa"
                fill
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Busca */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="flex-1 w-full">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                onSearch={onSearch}
                placeholder="Buscar produto..."
              />
            </div>
          </div>

          <div className="flex items-center lg:gap-7 gap-4 text-base font-medium cursor-pointerb text-primary">
            {/* Nav desktop */}
            <div className="items-center gap-12">
              <nav className="flex items-center lg:gap-7 gap-4 text-base font-medium cursor-pointerb text-primary">
                <div ref={categoryMenuRef} className="relative hidden lg:block">
                  <button
                    type="button"
                    aria-expanded={categoriesOpen}
                    aria-haspopup="menu"
                    onClick={() => setCategoriesOpen((current) => !current)}
                    className="cursor-pointer flex items-center gap-1 transition-colors duration-200 ease-in-out hover:text-primary/70"
                  >
                    <span className="font-semibold">Categorias</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        categoriesOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {categoriesOpen && categories.length > 0 && (
                    <DesktopCategoryMegaMenu
                      categories={categories}
                      onClose={() => setCategoriesOpen(false)}
                    />
                  )}
                </div>

                <Link
                  href="/#about"
                  className="hidden lg:flex transition-colors duration-200 ease-in-out hover:text-primary/70"
                >
                  Sobre
                </Link>
              </nav>
            </div>

            {/* Ícone de Usuário com menu dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={onUserClick}
                aria-label={isAuth ? `Olá, ${userName}` : "Entrar na conta"}
                className="cursor-pointer transition-colors duration-200 ease-in-out text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden  rounded-full">
                  {isAuth && userName ? (
                    <span className="flex h-full w-full items-center justify-center bg-primary text-xs font-bold text-white">
                      {userInitials || "U"}
                    </span>
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </span>

                {isAuth && userName && (
                  <span className="flex items-center gap-1 max-w-[90px] text-sm font-medium">
                    {/* <span className="truncate">{userName.split(" ")[0]}</span> */}
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  </span>
                )}
              </button>

              {/* Dropdown do usuário autenticado */}
              {isAuth && userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-border/60 bg-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3">
                    <p className="mt-1 text-sm font-semibold text-foreground truncate">
                      {userName}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/70 truncate">
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
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Meus Pedidos
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onLogout?.();
                        onMenuItemClick?.();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ícone de Carrinho com badge */}
            <button
              type="button"
              onClick={onCartClick}
              aria-label={`Carrinho${cartCount > 0 ? ` (${cartCount} itens)` : ""}`}
              className="cursor-pointer relative transition-colors duration-200 ease-in-out hover:text-primary/70"
            >
              <ShoppingCart className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
            {/* Nav mobile */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      isHomePage
                        ? "text-primary items-center flex"
                        : "text-gray-800",
                    )}
                  >
                    <MenuIcon size={32} />
                  </button>
                </SheetTrigger>
                <SheetContent onCloseAutoFocus={(e) => e.preventDefault()}>
                  <SheetHeader>
                    <SheetTitle className="text-2xl text-primary">
                      Menu
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="mx-6 mt-8 flex flex-col gap-5 text-base font-medium text-primary">
                    <SheetClose asChild>
                      <Link href="/" className="hover:text-secondary">
                        Home
                      </Link>
                    </SheetClose>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary/70">
                        Categorias
                      </p>
                      {categories.length > 0 ? (
                        (() => {
                          const rootCategories = categories.filter(
                            (c) => !c.parentId,
                          );
                          const childCategories = categories.filter(
                            (c) => !!c.parentId,
                          );

                          return (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                              <SheetClose asChild>
                                <Link
                                  href="/products-all"
                                  className="block py-1 text-sm font-semibold text-primary hover:text-secondary"
                                >
                                  Ver todas as categorias
                                </Link>
                              </SheetClose>
                              {rootCategories.map((category) => {
                                const children =
                                  category.subcategories &&
                                  category.subcategories.length > 0
                                    ? category.subcategories
                                    : childCategories.filter(
                                        (c) => c.parentId === category.id,
                                      );

                                return (
                                  <div key={category.id} className="space-y-1">
                                    <SheetClose asChild>
                                      <Link
                                        href={`/products-all?categoryIds=${category.id}`}
                                        className="block py-1 text-sm font-medium text-foreground hover:text-secondary"
                                      >
                                        {category.name}
                                      </Link>
                                    </SheetClose>
                                    {children.length > 0 && (
                                      <div className="pl-3 space-y-1 border-l border-border/40 ml-1">
                                        {children.map((sub) => (
                                          <SheetClose asChild key={sub.id}>
                                            <Link
                                              href={`/products-all?categoryIds=${sub.id}`}
                                              className="block py-0.5 text-xs text-muted-foreground hover:text-secondary"
                                            >
                                              {sub.name}
                                            </Link>
                                          </SheetClose>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()
                      ) : (
                        <SheetClose asChild>
                          <Link
                            href="/products-all"
                            className="block py-1 text-sm hover:text-secondary"
                          >
                            Ver todas
                          </Link>
                        </SheetClose>
                      )}
                    </div>

                    <SheetClose asChild>
                      <Link href="/#about" className="hover:text-secondary">
                        Sobre
                      </Link>
                    </SheetClose>
                  </nav>
                  <Social />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="md:hidden mt-2">
          <div className="relative">
            <div className="flex-1 w-full">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                onSearch={onSearch}
                placeholder="Buscar produto..."
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}

function HeaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState(
    searchParams.get("search") || "",
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const isHomePage = pathname === "/";

  // Carrinho e Autenticação
  const { itemsCount, toggleCart } = useCartStore();
  const { isAuth, user, logout } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const count = itemsCount();

  // Carrega o usuário logado ao iniciar
  useEffect(() => {
    const { setUser } = useAuthStore.getState();
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
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

  useEffect(() => {
    setInputValue(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        if (data.success) {
          setCategories(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryMenuRef.current &&
        !categoryMenuRef.current.contains(event.target as Node)
      ) {
        setCategoriesOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = useCallback(
    (nextValue: string) => {
      const normalized = nextValue.trim();
      const current = searchParams.get("search") || "";
      if (normalized === current) return;
      const params = new URLSearchParams(searchParams);
      if (normalized) {
        params.set("search", normalized);
      } else {
        params.delete("search");
      }
      const queryString = params.toString();
      const targetPath = queryString
        ? `/products-all?${queryString}`
        : "/products-all";
      router.push(targetPath);
    },
    [router, searchParams],
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
      <HeaderLayout
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSearch={handleSearchSubmit}
        isHomePage={isHomePage}
        categories={categories}
        categoriesOpen={categoriesOpen}
        setCategoriesOpen={setCategoriesOpen}
        categoryMenuRef={categoryMenuRef}
        // Cart & Auth props
        cartCount={count}
        onCartClick={toggleCart}
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

      {/* CartDrawer — renderizado uma vez aqui */}
      <CartDrawer />

      {/* Modal de autenticação do cliente */}
      <CustomerAuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <Suspense
      fallback={
        <HeaderLayout
          inputValue=""
          setInputValue={() => {}}
          onSearch={() => {}}
          isHomePage={isHomePage}
          categories={[]}
          categoriesOpen={false}
          setCategoriesOpen={() => {}}
          categoryMenuRef={{ current: null }}
        />
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
