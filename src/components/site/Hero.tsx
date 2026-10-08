"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const slides = [
  {
    img: "/img/hero/hero-cordas.jpg",
    kicker: "Cordas",
    title: "Seu próximo instrumento começa aqui.",
    text: "Violões e guitarras selecionados por quem entende de música.",
    cta: "Ver produtos",
    href: "/products-all?categorySlug=cordas",
  },
  {
    img: "/img/hero/hero-baterias.jpg",
    kicker: "Ofertas especiais Pink Music",
    title: "Baterias com até 12% off.",
    text: "Acústicas e eletrônicas, prontas para o palco.",
    cta: "Ver oferta",
    href: "/products-all?categorySlug=baterias",
  },
  {
    img: "/img/hero/hero-studio.jpg",
    kicker: "Home Studio",
    title: "Equipamentos para quem leva música a sério.",
    text: "Interfaces, monitores e microfones para gravar em casa.",
    cta: "Comprar agora",
    href: "/products-all?categorySlug=home-studio",
  },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <section
      className="container-page pt-4 md:pt-6"
      aria-roledescription="carrossel"
      aria-label="Destaques e Promoções"
    >
      <div className="relative h-[460px] overflow-hidden rounded-3xl bg-hero shadow-card md:h-[520px]">
        {slides.map((s, index) => {
          const isActive = index === current;
          return (
            <div
              key={s.img}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                isActive ? "opacity-100 z-10" : "pointer-events-none opacity-0 z-0"
              )}
              aria-hidden={!isActive}
            >
              {/* Imagem de fundo */}
              <Image
                src={s.img}
                alt={s.title}
                fill
                priority={index === 0}
                className="object-cover object-[70%_center]"
                sizes="(max-width: 768px) 100vw, 1320px"
              />

              {/* Overlay com gradiente do tema */}
              <div className="bg-hero-overlay absolute inset-0" />

              {/* Conteúdo textual */}
              <div className="relative flex h-full max-w-xl flex-col justify-end p-6 text-hero-foreground md:justify-center md:p-14 z-20">
                <span className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-ml font-display">
                  {s.kicker}
                </span>
                <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl font-display">
                  {s.title}
                </h1>
                <p className="mt-4 text-sm text-hero-foreground/85 md:text-base lg:text-lg">
                  {s.text}
                </p>
                <div className="mt-7">
                  <Button variant="hero" size="lg" asChild className="rounded-full px-6 py-6 font-semibold">
                    <Link href={s.href} className="inline-flex items-center gap-2">
                      {s.cta} <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Controles de navegação (indicadores e setas) */}
        <div className="absolute bottom-6 right-6 z-30 flex items-center gap-2">
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={handlePrev}
            className="hidden size-11 place-items-center rounded-full border border-hero-foreground/30 text-hero-foreground hover:bg-hero-foreground/15 transition-colors cursor-pointer md:grid"
          >
            <ChevronLeft className="size-5" />
          </button>

          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Ir para slide ${index + 1}`}
              onClick={() => setCurrent(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
                index === current
                  ? "w-8 bg-hero-foreground"
                  : "w-3 bg-hero-foreground/40 hover:bg-hero-foreground/70"
              )}
            />
          ))}

          <button
            type="button"
            aria-label="Próximo slide"
            onClick={handleNext}
            className="hidden size-11 place-items-center rounded-full border border-hero-foreground/30 text-hero-foreground hover:bg-hero-foreground/15 transition-colors cursor-pointer md:grid"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
