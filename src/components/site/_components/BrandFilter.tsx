"use client";

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
  brands: Brand[];
  className?: string;
}

export default function BrandFilter({
  value,
  onChange,
  brands,
  className = "",
}: BrandFilterProps) {
  const handleValueChange = (newValue: string) => {
    onChange(newValue === "all" ? "" : newValue);
  };

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
