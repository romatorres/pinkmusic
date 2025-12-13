"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
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
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ value, onChange }) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch categories");
        }
        return res.json();
      })
      .then((response: { success: boolean; data: Category[] }) => {
        const sortedCategories = response.data.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setCategories(sortedCategories);
      })
      .catch(() => toast.error("Erro ao carregar categorias."));
  }, []);

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
