"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";
import { PageContainer } from "../ui/Page-container";
import Image from "next/image";

export default function Header() {
  return (
    <header className="absolute left-0 top-0 right-0 z-10 flex min-h-[100px] w-full items-center justify-center py-4 md:min-h-[124px]">
      <PageContainer>
        <div className="flex h-[70px] w-full items-center justify-between">
          {/* Logo */}
          <div className="relative w-[170px] md:w-[200px] lg:w-[240px] aspect-[240/70.5]">
            <Image
              src="/img/logo-pink.svg"
              alt="Logo da empresa"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-12 md:flex">
            <nav className="flex items-center gap-7 text-base font-medium text-primary cursor-pointer">
              <a
                href="#"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Home
              </a>
              <a
                href="#"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Produtos
              </a>
              <a
                href="#"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Sobre
              </a>
              <a
                href="#"
                className="transition-colors duration-300 ease-in-out hover:text-secondary"
              >
                Contatos
              </a>
            </nav>
            <div className="flex items-center gap-4">
              <Image
                src="/img/icon-facebook.svg"
                alt="Icon Social Facebook"
                width={44}
                height={44}
                className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
              />
              <Image
                src="/img/icon-instagram.svg"
                alt="Icon Social Instagram"
                width={44}
                height={44}
                className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
              />
              <Image
                src="/img/icon-twitter.svg"
                alt="Icon Social Twitter"
                width={44}
                height={44}
                className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
              />
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button className="text-primary">
                  <MenuIcon size={32} />
                </button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle className="text-2xl text-primary">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <nav className="mx-6 mt-8 flex flex-col gap-5 text-base font-medium text-primary">
                  <a href="#" className="hover:text-secondary">
                    Home
                  </a>
                  <a href="#" className="hover:text-secondary">
                    Produtos
                  </a>
                  <a href="#" className="hover:text-secondary">
                    Sobre
                  </a>
                  <a href="#" className="hover:text-secondary">
                    Contatos
                  </a>
                </nav>
                <div className="mt-8 flex items-center justify-center gap-6">
                  <Image
                    src="/img/icon-facebook.svg"
                    alt="Icon Social Facebook"
                    width={44}
                    height={44}
                    className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                  <Image
                    src="/img/icon-instagram.svg"
                    alt="Icon Social Instagram"
                    width={44}
                    height={44}
                    className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                  <Image
                    src="/img/icon-twitter.svg"
                    alt="Icon Social Twitter"
                    width={44}
                    height={44}
                    className="object-contain transition-transform duration-300 ease-in-out hover:scale-110 hover:cursor-pointer"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
