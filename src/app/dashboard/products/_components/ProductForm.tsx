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
  const [formCategory, setFormCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);

    if (!productId) {
      toast.error("Por favor, insira um ID de produto.");
      setIsAdding(false);
      return;
    }

    try {
      const response = await fetch("/api/products/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          categoryId: formCategory || null,
          brandId: formBrand || null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Produto adicionado com sucesso!");
        // Limpar o formulário
        setProductId("");
        setFormCategory("");
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
          <div className="flex flex-col gap-4">
            <div className="w-full">
              <Label htmlFor="productId" className="mb-2">
                ID do Produto do Mercado Livre
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
              <Label htmlFor="formCategory" className="mb-2">
                Categoria (Opcional)
              </Label>
              <Select onValueChange={setFormCategory} value={formCategory}>
                <SelectTrigger id="formCategory" className="w-full">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>

                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full">
              <Label htmlFor="formBrand" className="mb-2">
                Marca (Opcional)
              </Label>
              <Select onValueChange={setFormBrand} value={formBrand}>
                <SelectTrigger id="formBrand" className="w-full">
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>

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
