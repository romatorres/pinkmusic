import type { ReactNode } from "react";
import Link from "next/link";
import { PageContainer } from "../ui/Page-container";

type Category = {
  slug: string;
  name: string;
  icon: ReactNode;
};

/** Base compartilhada: mesmo traço e tamanho para todos os ícones */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

const categories: Category[] = [
  {
    slug: "cordas",
    name: "Cordas",
    icon: (
      <Icon>
        <g transform="rotate(45 32 32)">
          <rect x="29" y="4" width="6" height="9" rx="1.5" />
          <path d="M30 13V32M34 13V32" />
          <path d="M30 32C22 32 20 40 25 44C20 47 19 58 32 58C45 58 44 47 39 44C44 40 42 32 34 32" />
          <circle cx="32" cy="45" r="3.5" />
          <path d="M28 52H36M32 13V41.5" />
        </g>
      </Icon>
    ),
  },
  {
    slug: "teclas",
    name: "Teclas",
    icon: (
      <Icon>
        <rect x="6" y="14" width="52" height="36" rx="3" />
        <path d="M14.7 14V50M23.3 14V50M32 14V50M40.7 14V50M49.3 14V50" />
        <g fill="currentColor">
          <rect x="12.2" y="14" width="5" height="22" rx="1" />
          <rect x="20.8" y="14" width="5" height="22" rx="1" />
          <rect x="38.2" y="14" width="5" height="22" rx="1" />
          <rect x="46.8" y="14" width="5" height="22" rx="1" />
        </g>
      </Icon>
    ),
  },
  {
    slug: "percussao",
    name: "Percussão",
    icon: (
      <Icon>
        <ellipse cx="19" cy="18" rx="12" ry="4.5" />
        <ellipse cx="19" cy="18" rx="8" ry="2.2" />
        <path d="M7 18L10 50Q19 55 28 50L31 18" />
        <path d="M8.5 32Q19 36.5 29.5 32" />
        <ellipse cx="45" cy="24" rx="10" ry="3.8" />
        <ellipse cx="45" cy="24" rx="6.5" ry="1.8" />
        <path d="M35 24L37.5 50Q45 54 52.5 50L55 24" />
        <path d="M36.3 37Q45 40.5 53.7 37" />
      </Icon>
    ),
  },
  {
    slug: "baterias",
    name: "Baterias",
    icon: (
      <Icon>
        <ellipse cx="19" cy="24" rx="8" ry="3" />
        <path d="M11 24V31Q19 35 27 31V24" />
        <ellipse cx="45" cy="24" rx="8" ry="3" />
        <path d="M37 24V31Q45 35 53 31V24" />
        <circle cx="32" cy="45" r="13" />
        <circle cx="32" cy="45" r="4.5" />
        <path d="M26 5L36 15M38 5L28 15" />
      </Icon>
    ),
  },
  {
    slug: "audio",
    name: "Áudio",
    icon: (
      <Icon>
        <path d="M12 36V32A20 20 0 0 1 52 32V36" />
        <rect x="8" y="36" width="8" height="16" rx="3" />
        <rect x="48" y="36" width="8" height="16" rx="3" />
      </Icon>
    ),
  },
  {
    slug: "home-studio",
    name: "Home Studio",
    icon: (
      <Icon>
        <rect x="24" y="6" width="16" height="26" rx="8" />
        <path d="M24 16H40M24 22H40" />
        <path d="M18 24V28A14 14 0 0 0 46 28V24" />
        <path d="M32 42V54M22 56H42" />
      </Icon>
    ),
  },
  {
    slug: "sopro",
    name: "Sopro",
    icon: (
      <Icon>
        <path d="M12 29H40M12 35H40M12 29V35M12 32H5M5 29V35" />
        <path d="M40 29L56 18M40 35L56 46M56 18Q60 32 56 46" />
        <path d="M22 29V20M28 29V20M34 29V20M20 20H24M26 20H30M32 20H36" />
        <path d="M20 35V44A4 4 0 0 0 24 48H32A4 4 0 0 0 36 44V35" />
      </Icon>
    ),
  },
];

export function CategoriesSection() {
  return (
    <section
      aria-labelledby="categories-title"
      className="bg-popover px-4 md:py-24 py-12 text-foreground sm:px-6"
    >
      <PageContainer>
        {/* Título com linhas laterais */}
        <div className="mb-8 flex items-center gap-4 sm:gap-6">
          <span aria-hidden className="h-px flex-1 bg-foreground opacity-50" />
          <h2 className="text-3xl text-primary font-tanker uppercase leading-none tracking-wide sm:text-4xl">
            Categorias
          </h2>
          <span aria-hidden className="h-px flex-1 bg-foreground opacity-50" />
        </div>

        {/* Mobile/tablet: carrossel horizontal | Desktop (lg+): 7 colunas */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0 lg:pb-0">
          {categories.map((category) => (
            <li key={category.slug} className="w-36 shrink-0 snap-start lg:w-auto">
              <Link
                href={`/products-all?categorySlug=${category.slug}`}
                className="group flex flex-col items-center gap-3 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-(color:--secondary)"
              >
                <span className="flex aspect-[4/5] w-full items-center justify-center bg-[var(--primary)] p-[22%] text-[var(--background)] transition-colors duration-200 group-hover:bg-[var(--foreground)] group-hover:text-[var(--tertiary)] group-focus-visible:bg-[var(--foreground)] group-focus-visible:text-[var(--tertiary)]">
                  {category.icon}
                </span>
                <span className="text-center font-[family-name:var(--font-tanker)] text-xl uppercase tracking-wide transition-colors group-hover:text-[var(--primary)] group-focus-visible:text-[var(--primary)]">
                  {category.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PageContainer>
    </section>
  );
}
