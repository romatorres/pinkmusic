"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Category } from "@/lib/types";

interface CategoryFilterProps {
  value: string;
  onChange: (categoryId: string) => void;
  className?: string;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({
  value,
  onChange,
  className,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch categories");
        }
        return res.json();
      })
      .then(setCategories)
      .catch(() => toast.error("Erro ao carregar categorias."));
  }, []);

  return (
    <select
      id="categoryFilter"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ||
        "w-full px-3 py-2 border rounded border-foreground max-w-2xs bg-sidebar-primary text-foreground "
      }
    >
      <option value="">Todas as Categorias</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
};

export default CategoryFilter;
