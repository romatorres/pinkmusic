"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon, Search } from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Social from "./_components/Social";
import { Input } from "../ui/input";
import { SearchInput } from "@/components/ui/SearchInput";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState(
    searchParams.get("search") || ""
  );
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  useEffect(() => {
    setInputValue(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const currentSearchInUrl = searchParams.get("search") || "";
    if (inputValue === currentSearchInUrl) {
      return;
    }

    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (inputValue) {
        params.set("search", inputValue);
      } else {
        params.delete("search");
      }

      if (inputValue) {
        router.push(`/products-all?${params.toString()}`);
      } else if (pathname === "/products-all") {
        router.push(`/products-all?${params.toString()}`);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [inputValue, searchParams, pathname, router]);

  return (
    <header
      className={cn(
        "left-0  right-0 z-10 flex min-h-[100px] w-full items-center justify-center py-3 md:min-h-[124px]",
        isHomePage ? "absolute top-6" : "relative top-0"
      )}
    >
      <PageContainer>
        {/* Logo */}
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

          {/* Search - Desktop */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8">
            <div className="flex-1 w-full">
              <SearchInput
                value={inputValue}
                onChange={setInputValue}
                placeholder="Buscar produto..."
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-12 lg:flex">
            <nav className="flex items-center gap-7 text-base font-medium cursor-pointerb text-primary">
              <Link
                href="/"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Home
              </Link>
              <Link
                href="/products-all"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Produtos
              </Link>
              <Link
                href="/#about"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Sobre
              </Link>
              <Link
                href="/#contact"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Contatos
              </Link>
            </nav>
          </div>

          {/* Mobile Navigation */}
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

        {/* Search - Mobile */}
        <div className="md:hidden mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-10 pr-4 h-10 bg-background border-primary/20"
              aria-label="Buscar produtos"
            />
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
