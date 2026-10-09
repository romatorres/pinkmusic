"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

interface Partner {
  id: string;
  name: string;
  imageUrl: string;
}

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/partners");
        if (response.ok) {
          const data = await response.json();
          setPartners(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Erro ao carregar parceiros:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPartners();
  }, []);

  // Determinar a URL da imagem (Cloudinary, Base64 ou legado relativo)
  const getImageSrc = (imageUrl: string) => {
    if (!imageUrl) return "";
    if (
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("https://") ||
      imageUrl.startsWith("data:")
    ) {
      return imageUrl;
    }
    return `/partners/${imageUrl}`;
  };

  // Garante uma base suficiente de logos para cobrir telas ultra-largas
  const baseItems = useMemo(() => {
    if (!partners || partners.length === 0) return [];
    let items = [...partners];
    while (items.length < 8) {
      items = [...items, ...partners];
    }
    return items;
  }, [partners]);

  // Se já carregou e não há parceiros cadastrados, não exibe a seção vazia
  if (!isLoading && partners.length === 0) {
    return null;
  }

  return (
    <section className="container-page my-8 md:my-12">
      <div className="relative w-full rounded-2xl md:rounded-3xl bg-card border border-border/80 shadow-card py-6 px-4 md:px-8 overflow-hidden">
        {/* Gradientes de fade suaves nas extremidades integrados com o fundo bg-card */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-card via-card/80 to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-card via-card/80 to-transparent z-10" />

        <div className="w-full overflow-hidden">
          <div className="flex animate-marquee group items-center">
            {/* Conjunto 1 */}
            <div className="flex shrink-0 items-center justify-around gap-8 md:gap-14 pr-8 md:pr-14">
              {baseItems.map((logo, index) => (
                <div
                  key={`partner-a-${logo.id}-${index}`}
                  className="relative h-10 w-28 md:h-12 md:w-36 shrink-0 flex items-center justify-center grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
                  title={logo.name}
                >
                  <Image
                    src={getImageSrc(logo.imageUrl)}
                    alt={logo.name}
                    fill
                    sizes="(max-width: 768px) 112px, 144px"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>

            {/* Conjunto 2 (Espelho 100% idêntico para loop contínuo e sem diferença de opacidade) */}
            <div
              className="flex shrink-0 items-center justify-around gap-8 md:gap-14 pr-8 md:pr-14"
              aria-hidden="true"
            >
              {baseItems.map((logo, index) => (
                <div
                  key={`partner-b-${logo.id}-${index}`}
                  className="relative h-10 w-28 md:h-12 md:w-36 shrink-0 flex items-center justify-center grayscale opacity-75 hover:grayscale-0 hover:opacity-100 transition-all duration-300 hover:scale-105"
                  title={logo.name}
                >
                  <Image
                    src={getImageSrc(logo.imageUrl)}
                    alt={logo.name}
                    fill
                    sizes="(max-width: 768px) 112px, 144px"
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
