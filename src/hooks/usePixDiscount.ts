"use client";

import { useState, useEffect } from "react";

interface PixSettings {
  pixDiscountPercent: number;
  loading: boolean;
}

let cachedDiscount: number | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos

export function usePixDiscount(): PixSettings {
  const [pixDiscountPercent, setPixDiscountPercent] = useState<number>(
    cachedDiscount ?? 5
  );
  const [loading, setLoading] = useState<boolean>(cachedDiscount === null);

  useEffect(() => {
    const now = Date.now();

    // Usa cache se ainda válido
    if (
      cachedDiscount !== null &&
      cacheTimestamp !== null &&
      now - cacheTimestamp < CACHE_DURATION_MS
    ) {
      setPixDiscountPercent(cachedDiscount);
      setLoading(false);
      return;
    }

    const fetchDiscount = async () => {
      try {
        const res = await fetch("/api/settings/public");
        const data = await res.json();
        if (data.success && typeof data.data?.pixDiscountPercent === "number") {
          cachedDiscount = data.data.pixDiscountPercent;
          cacheTimestamp = Date.now();
          setPixDiscountPercent(data.data.pixDiscountPercent);
        }
      } catch {
        // Mantém o valor padrão em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchDiscount();
  }, []);

  return { pixDiscountPercent, loading };
}
