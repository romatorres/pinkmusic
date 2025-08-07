"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ProductData {
  title: string;
  price: number;
  available_quantity: number;
}

export default function EditProductPage() {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const response = await fetch(`/api/products/${id}`);
          const result = await response.json();
          if (result.success) {
            setProduct(result.data);
          } else {
            toast.error(result.error || "Produto não encontrado.");
            router.push("/dashboard/products");
          }
        } catch (error) {
          toast.error("Erro de conexão ao buscar produto.");
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct(prev => prev ? { ...prev, [name]: name === 'price' || name === 'available_quantity' ? parseFloat(value) : value } : null);
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
