"use client";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Social from "./Social";

export default function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <header
      className={cn(
        "left-0 top-0 right-0 z-10 flex min-h-[100px] w-full items-center justify-center py-3 md:min-h-[124px]",
        isHomePage ? "absolute" : "relative bg-card shadow-sm"
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

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-12 md:flex">
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
            <Social />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
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
      </PageContainer>
    </header>
  );
}