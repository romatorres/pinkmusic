"use client";

import { useEffect, useState, useMemo } from "react";
import { PageContainer } from "../ui/Page-container";
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
    <div className="md:py-8 py-4">
      <PageContainer>
        <section className="relative self-center my-8 md:my-14 w-full max-w-[1440px] rounded-[36px] bg-white py-6 px-4 md:px-8 flex flex-col items-center justify-center shadow-sm overflow-hidden border border-black/5">
          {/* Gradientes de fade nas extremidades para entrada/saída suave */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 md:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 md:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />

          <div className="w-full overflow-hidden">
            <div className="flex animate-marquee group">
              {/* Conjunto 1 */}
              <div className="flex shrink-0 items-center justify-around gap-8 md:gap-14 pr-8 md:pr-14">
                {baseItems.map((logo, index) => (
                  <div
                    key={`partner-a-${logo.id}-${index}`}
                    className="relative h-10 w-28 md:h-12 md:w-36 flex-shrink-0 flex items-center justify-center"
                    title={logo.name}
                  >
                    <Image
                      src={getImageSrc(logo.imageUrl)}
                      alt={logo.name}
                      fill
                      sizes="(max-width: 768px) 112px, 144px"
                      className="object-contain filter grayscale opacity-60 transition-all duration-300 ease-in-out hover:grayscale-0 hover:opacity-100 hover:scale-110"
                    />
                  </div>
                ))}
              </div>

              {/* Conjunto 2 (Espelho idêntico para loop contínuo e sem pulos) */}
              <div
                className="flex shrink-0 items-center justify-around gap-8 md:gap-14 pr-8 md:pr-14"
                aria-hidden="true"
              >
                {baseItems.map((logo, index) => (
                  <div
                    key={`partner-b-${logo.id}-${index}`}
                    className="relative h-10 w-28 md:h-12 md:w-36 flex-shrink-0 flex items-center justify-center"
                    title={logo.name}
                  >
                    <Image
                      src={getImageSrc(logo.imageUrl)}
                      alt={logo.name}
                      fill
                      sizes="(max-width: 768px) 112px, 144px"
                      className="object-contain filter grayscale opacity-60 transition-all duration-300 ease-in-out hover:grayscale-0 hover:opacity-100 hover:scale-110"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </PageContainer>
    </div>
  );
}
