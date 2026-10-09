"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Instagram, Facebook, MapPin, Phone } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  const col = "space-y-2.5 text-sm text-hero-foreground/75";
  const h =
    "mb-4 font-display text-sm font-bold uppercase tracking-wider text-hero-foreground";

  return (
    <footer className="mt-20 bg-hero text-hero-foreground border-t border-hero-foreground/10">
      <div className="container-page grid grid-cols-2 gap-8 py-14 md:grid-cols-4">
        {/* Coluna 1: Pink Music */}
        <div>
          <h3 className={h}>Pink Music</h3>
          <ul className={col}>
            <li>
              <Link href="/#about" className="hover:text-hero-foreground transition-colors">
                Sobre nós
              </Link>
            </li>
            <li>
              <Link href="/#about" className="hover:text-hero-foreground transition-colors">
                Nossas lojas
              </Link>
            </li>
            <li>
              <a
                href="https://wa.me/5575999661614"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-hero-foreground transition-colors"
              >
                Fale conosco
              </a>
            </li>
            <li>
              <a
                href="https://www.mercadolivre.com.br/pagina/pinkmusic"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-hero-foreground transition-colors text-ml font-semibold"
              >
                Loja no Mercado Livre ↗
              </a>
            </li>
          </ul>
        </div>

        {/* Coluna 2: Comprar */}
        <div>
          <h3 className={h}>Comprar</h3>
          <ul className={col}>
            <li>
              <Link href="/products-all" className="hover:text-hero-foreground transition-colors">
                Todos os produtos
              </Link>
            </li>
            <li>
              <Link href="/products-all" className="hover:text-hero-foreground transition-colors">
                Categorias
              </Link>
            </li>
            <li>
              <Link
                href="/products-all?hasDiscount=true"
                className="hover:text-hero-foreground transition-colors"
              >
                Ofertas especiais
              </Link>
            </li>
            <li>
              <Link
                href="/products-all?origin=LOCAL"
                className="hover:text-hero-foreground transition-colors"
              >
                Pronta entrega local
              </Link>
            </li>
          </ul>
        </div>

        {/* Coluna 3: Atendimento */}
        <div>
          <h3 className={h}>Atendimento</h3>
          <ul className={col}>
            <li>
              <Link href="/meus-pedidos" className="hover:text-hero-foreground transition-colors">
                Meus pedidos
              </Link>
            </li>
            <li>
              <span className="text-hero-foreground/60">
                Loja 01: Rua JJ Seabra, 31
              </span>
            </li>
            <li>
              <span className="text-hero-foreground/60">
                Loja 02: Rua JJ Seabra, 163
              </span>
            </li>
            <li>
              <a
                href="https://wa.me/5575999661614"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-hero-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <Phone className="size-3.5" /> (75) 99966-1614
              </a>
            </li>
          </ul>
        </div>

        {/* Coluna 4: Institucional & Identidade */}
        <div>
          <h3 className={h}>Institucional</h3>
          <ul className={col}>
            <li>Mais de 30 anos de tradição</li>
            <li>Instrumentos revisados e originais</li>
            <li>Garantia e nota fiscal</li>
            <li>Retirada grátis em Feira de Santana</li>
          </ul>
        </div>
      </div>

      {/* Subfooter com créditos e redes sociais */}
      <div className="border-t border-hero-foreground/10">
        <div className="container-page flex flex-col items-center justify-between gap-4 py-6 text-sm text-hero-foreground/70 md:flex-row">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <Link href="/" className="inline-block">
              <Image
                src="/img/logo-pink_wh.svg"
                alt="Logo Pink Music"
                width={110}
                height={40}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="hidden sm:inline text-hero-foreground/30">|</span>
            <span className="flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="size-4 shrink-0 text-ml" />
              Pink Music · Feira de Santana — Bahia · &copy; {year}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Redes Sociais */}
            <div className="flex gap-2">
              <a
                href="https://www.instagram.com/pinkmusicinstrumentos"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da Pink Music"
                className="grid size-10 place-items-center rounded-full border border-hero-foreground/20 hover:bg-hero-foreground/10 hover:text-white transition-colors cursor-pointer"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="https://www.facebook.com/PinkMusicInstrumentos/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook da Pink Music"
                className="grid size-10 place-items-center rounded-full border border-hero-foreground/20 hover:bg-hero-foreground/10 hover:text-white transition-colors cursor-pointer"
              >
                <Facebook className="size-4" />
              </a>
            </div>

            {/* Crédito do desenvolvedor */}
            <a
              href="https://romatorres-dev.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-hero-foreground/60 hover:text-hero-foreground transition-colors pl-2 border-l border-hero-foreground/20"
              title="Desenvolvido por Roma Torres"
            >
              <span>by</span>
              <Image
                src="/img/logo-roma.svg"
                alt="Logo Roma Torres"
                width={22}
                height={22}
                className="w-5 h-auto opacity-80 hover:opacity-100 transition-opacity"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
