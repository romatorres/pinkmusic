"use client";

import { useEffect, useState } from "react";
import { Brand } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrandFilterProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function BrandFilter({
  value,
  onChange,
  className = "",
}: BrandFilterProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await fetch("/api/brands");
        const data = await response.json();
        setBrands(data);
      } catch (error) {
        console.error("Erro ao buscar marcas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();
  }, []);

  const handleValueChange = (newValue: string) => {
    onChange(newValue === "all" ? "" : newValue);
  };

  if (loading) {
    return (
      <Select value="all" disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Carregando marcas..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Carregando marcas...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select onValueChange={handleValueChange} value={value || "all"}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Todas as Marcas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Buscar por Marcas</SelectItem>
        {brands.map((brand) => (
          <SelectItem key={brand.id} value={brand.id}>
            {brand.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
