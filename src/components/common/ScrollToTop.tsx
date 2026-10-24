"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ScrollToTopHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Força o scroll para o topo imediato ao navegar entre páginas ou alterar filtros/busca
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname, searchParams]);

  return null;
}

import { Suspense } from "react";

export default function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopHandler />
    </Suspense>
  );
}
