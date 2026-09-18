"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon, Search, ShoppingCart, User } from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Social from "./_components/Social";
import { Input } from "../ui/input";
import { SearchInput } from "@/components/ui/SearchInput";
import { Suspense, useCallback, useEffect, useState } from "react";

function HeaderLayout({
  inputValue,
  setInputValue,
  onSearch,
  isHomePage,
}: {
  inputValue: string;
  setInputValue: (value: string) => void;
  onSearch: (value: string) => void;
  isHomePage: boolean;
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

          <div className="hidden items-center gap-12 lg:flex">
            <nav className="flex items-center gap-7 text-base font-medium cursor-pointerb text-primary">
              <Link
                href="/products-all"
                className="transition-colors duration-200 ease-in-out hover:text-primary/70"
              >
                Produtos
              </Link>
              <Link
                href="/#about"
                className="transition-colors duration-200 ease-in-out hover:text-primary/70"
              >
                Sobre
              </Link>
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
            </nav>
          </div>

          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className={cn(isHomePage ? "text-primary" : "text-gray-800")}
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
                  <SheetClose asChild>
                    <Link href="/products-all" className="hover:text-secondary">
                      Produtos
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/#about" className="hover:text-secondary">
                      Sobre
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/#contact" className="hover:text-secondary">
                      Contatos
                    </Link>
                  </SheetClose>
                </nav>
                <Social />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="md:hidden mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSearch(inputValue);
                }
              }}
              className="pl-10 pr-4 h-10 bg-background border-primary/20"
              aria-label="Buscar produtos"
            />
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
  const isHomePage = pathname === "/";

  useEffect(() => {
    setInputValue(searchParams.get("search") || "");
  }, [searchParams]);

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
          setInputValue={() => {}}
          onSearch={() => {}}
          isHomePage={isHomePage}
        />
      }
    >
      <HeaderContent />
    </Suspense>
  );
}
