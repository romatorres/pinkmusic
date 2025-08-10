"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Category } from "@/lib/types";

interface ProductData {
  title: string;
  price: number;
  available_quantity: number;
  categoryId: string | null;
}

export default function EditProductPage() {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchProductAndCategories = async () => {
        try {
          const [productResponse, categoriesResponse] = await Promise.all([
            fetch(`/api/products/${id}`),
            fetch("/api/categories"),
          ]);

          const productResult = await productResponse.json();
          const categoriesResult = await categoriesResponse.json();

          if (productResult.success) {
            setProduct(productResult.data);
          } else {
            toast.error(productResult.error || "Produto não encontrado.");
            router.push("/dashboard/products");
          }

          if (Array.isArray(categoriesResult)) {
            setCategories(categoriesResult);
          } else {
            toast.error("Erro ao buscar categorias.");
          }
        } catch (error) {
          toast.error("Erro de conexão ao buscar dados.");
        } finally {
          setLoading(false);
        }
      };
      fetchProductAndCategories();
    }
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProduct((prev) =>
      prev
        ? {
            ...prev,
            [name]:
              name === "price" || name === "available_quantity"
                ? parseFloat(value)
                : value,
          }
        : null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(product),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Produto atualizado com sucesso!");
        router.push("/dashboard/products");
      } else {
        toast.error(result.error || "Erro ao atualizar produto.");
      }
    } catch (error) {
      toast.error("Erro de conexão ao atualizar produto.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!product) {
    return <div className="p-8">Produto não encontrado.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Editar Produto</h1>

      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Editar informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                type="text"
                value={product.title}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="price">Preço</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={product.price}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="available_quantity">Quantidade Disponível</Label>
              <Input
                id="available_quantity"
                name="available_quantity"
                type="number"
                value={product.available_quantity}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={product.categoryId || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="categoryId">Categoria</Label>
              <select
                id="categoryId"
                name="categoryId"
                value={product.categoryId || ""}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
