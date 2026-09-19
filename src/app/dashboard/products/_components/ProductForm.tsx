"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Category, Brand } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddProductFormProps {
  categories: Category[];
  brands: Brand[];
  onProductAdded: () => void;
}

export default function ProductForm({
  categories,
  brands,
  onProductAdded,
}: AddProductFormProps) {
  const [productId, setProductId] = useState("");
  const [formMainCategory, setFormMainCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Categorias Principais (parentId == null)
  const mainCategories = categories.filter((c) => !c.parentId);

  // Subcategorias filtradas pela Categoria Principal selecionada
  const availableSubcategories = formMainCategory && formMainCategory !== "none"
    ? categories.filter((c) => c.parentId === formMainCategory)
    : [];

  const handleMainCategoryChange = (val: string) => {
    setFormMainCategory(val);
    setFormSubCategory(""); // Limpa a subcategoria ao mudar a categoria principal
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    if (!productId) {
      toast.error("Por favor, insira um ID de produto.");
      setIsAdding(false);
      return;
    }

    // Se houver subcategoria selecionada, usa seu ID; senão usa o da categoria principal
    const finalCategoryId =
      formSubCategory && formSubCategory !== "none"
        ? formSubCategory
        : formMainCategory && formMainCategory !== "none"
        ? formMainCategory
        : null;

    try {
      const response = await fetch("/api/products/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          categoryId: finalCategoryId,
          brandId: formBrand && formBrand !== "none" ? formBrand : null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Produto adicionado com sucesso!");
        // Limpar o formulário
        setProductId("");
        setFormMainCategory("");
        setFormSubCategory("");
        setFormBrand("");
        // Notificar o componente pai
        onProductAdded();
      } else if (response.status === 409) {
        toast.error(result.error || "Produto já cadastrado no sistema.");
      } else {
        toast.error(result.error || "Erro ao adicionar produto.");
      }
    } catch (error) {
      console.error("Erro ao adicionar produto:", error);
      toast.error("Erro de conexão ao adicionar produto.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Adicionar Novo Produto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="w-full">
              <Label htmlFor="productId" className="mb-2">
                ID do Produto no Mercado Livre
              </Label>
              <Input
                id="productId"
                type="text"
                placeholder="Ex: MLB123456789"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              />
            </div>

            <div className="w-full">
              <Label htmlFor="formMainCategory" className="mb-2">
                Categoria Principal (Opcional)
              </Label>
              <Select onValueChange={handleMainCategoryChange} value={formMainCategory || "none"}>
                <SelectTrigger id="formMainCategory" className="w-full">
                  <SelectValue placeholder="Selecione a categoria principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {mainCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Label htmlFor="formSubCategory" className="mb-2">
                Subcategoria (Opcional)
              </Label>
              <Select
                onValueChange={setFormSubCategory}
                value={formSubCategory || "none"}
                disabled={!formMainCategory || formMainCategory === "none" || availableSubcategories.length === 0}
              >
                <SelectTrigger id="formSubCategory" className="w-full">
                  <SelectValue
                    placeholder={
                      !formMainCategory || formMainCategory === "none"
                        ? "Selecione uma Categoria primeiro"
                        : availableSubcategories.length === 0
                        ? "Sem subcategorias cadastradas"
                        : "Selecione uma subcategoria"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Usar Categoria Principal)</SelectItem>
                  {availableSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full">
              <Label htmlFor="formBrand" className="mb-2">
                Marca (Opcional)
              </Label>
              <Select onValueChange={setFormBrand} value={formBrand || "none"}>
                <SelectTrigger id="formBrand" className="w-full">
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            type="submit"
            disabled={isAdding}
            className="md:w-auto w-full"
          >
            {isAdding ? "Adicionando..." : "Adicionar Produto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

