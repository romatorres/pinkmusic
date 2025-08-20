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
        } catch {
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
    } catch {
      toast.error("Erro de conexão ao atualizar produto.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/products");
  };

  if (loading) {
    return <div className="p-8">Carregando...</div>;
  }

  if (!product) {
    return <div className="p-8">Produto não encontrado.</div>;
  }

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Editar Produto</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Editar informações do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="mb-2">
                Título
              </Label>
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
              <Label htmlFor="price" className="mb-2">
                Preço
              </Label>
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
              <Label htmlFor="available_quantity" className="mb-2">
                Quantidade Disponível
              </Label>
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
              <Label htmlFor="categoryId" className="mb-2">
                Categoria
              </Label>
              <select
                id="categoryId"
                name="categoryId"
                value={product.categoryId || ""}
                onChange={handleChange}
                className="w-full p-2 border border-foreground rounded"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col md:flex-row gap-4 pt-4">
              <Button
                type="submit"
                className="md:w-auto w-full"
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                type="button"
                variant="black"
                className="md:w-auto w-full px-10"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
