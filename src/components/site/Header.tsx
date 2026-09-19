"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronDown, MenuIcon, ShoppingCart, User } from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Social from "./_components/Social";
import { SearchInput } from "@/components/ui/SearchInput";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Category } from "@/lib/types";

function HeaderLayout({
  inputValue,
  setInputValue,
  onSearch,
  isHomePage,
  categories,
  categoriesOpen,
  setCategoriesOpen,
  categoryMenuRef,
}: {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSearch: (value: string) => void;
  isHomePage: boolean;
  categories: Category[];
  categoriesOpen: boolean;
  setCategoriesOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  categoryMenuRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <header
      className={cn(
        "left-0 right-0 z-10 flex min-h-[100px] w-full items-center justify-center py-3 md:min-h-[124px]",
        isHomePage ? "absolute top-6" : "relative top-0"
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
                    <span>Categorias</span>
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", categoriesOpen && "rotate-180")} />
                  </button>

                  {categoriesOpen && categories.length > 0 && (
                    <div className="absolute left-0 top-full z-20 mt-3 w-64 rounded-xl border border-border/60 bg-white p-2 shadow-lg">
                      <Link
                        href="/products-all"
                        onClick={() => setCategoriesOpen(false)}
                        className="mb-1 block rounded-lg px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 hover:text-primary/80"
                      >
                        Todas as categorias
                      </Link>

                      {categories.map((category) => (
                        <Link
                          key={category.id}
                          href={`/products-all?categoryIds=${category.id}`}
                          onClick={() => setCategoriesOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm text-primary transition-colors hover:bg-primary/5 hover:text-primary/80"
                        >
                          {category.name}
                        </Link>
                      ))}
                    </div>
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

            <Link
              href="/#"
              className="transition-colors duration-200 ease-in-out hover:text-primary/70"
            >
              <User />
            </Link>
            <Link
              href="/#"
              className="transition-colors duration-200 ease-in-out hover:text-primary/70"
            >
              <ShoppingCart />
            </Link>
            {/* Nav mobile */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    className={cn(isHomePage ? "text-primary items-center flex" : "text-gray-800")}
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
                        categories.map((category) => (
                          <SheetClose asChild key={category.id}>
                            <Link
                              href={`/products-all?categoryIds=${category.id}`}
                              className="block py-1 text-sm hover:text-secondary"
                            >
                              {category.name}
                            </Link>
                          </SheetClose>
                        ))
                      ) : (
                        <SheetClose asChild>
                          <Link href="/products-all" className="block py-1 text-sm hover:text-secondary">
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
  const [inputValue, setInputValue] = useState(searchParams.get("search") || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const isHomePage = pathname === "/";

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
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = useCallback(
    (nextValue: string) => {
      const normalized = nextValue.trim();
      const current = searchParams.get("search") || "";

      if (normalized === current) {
        return;
      }

      const params = new URLSearchParams(searchParams);
      if (normalized) {
        params.set("search", normalized);
      } else {
        params.delete("search");
      }

      const queryString = params.toString();
      const targetPath = queryString ? `/products-all?${queryString}` : "/products-all";
      router.push(targetPath);
    },
    [router, searchParams]
  );

  return (
    <HeaderLayout
      inputValue={inputValue}
      setInputValue={setInputValue}
      onSearch={handleSearchSubmit}
      isHomePage={isHomePage}
      categories={categories}
      categoriesOpen={categoriesOpen}
      setCategoriesOpen={setCategoriesOpen}
      categoryMenuRef={categoryMenuRef}
    />
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
          setInputValue={() => { }}
          onSearch={() => { }}
          isHomePage={isHomePage}
          categories={[]}
          categoriesOpen={false}
          setCategoriesOpen={() => { }}
          categoryMenuRef={{ current: null }}
        />
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
