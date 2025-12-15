"use client";

import React from "react";
import { Category } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CategoryFilterProps {
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onChange,
  categories,
}) => {
  const handleValueChange = (newValue: string) => {
    onChange(newValue === "all" ? "" : newValue);
  };

  return (
    <Select onValueChange={handleValueChange} value={value || "all"}>
      <SelectTrigger>
        <SelectValue placeholder="Buscar por Categorias" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Buscar por Categorias</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id}>
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CategoryFilter;
