"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Category, Brand } from "@/lib/types";

interface ProductData {
  title: string;
  price: number;
  available_quantity: number;
  categoryId: string | null;
  brandId: string | null;
}

export default function EditProductPage() {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchProductAndData = async () => {
        try {
          const [productResponse, categoriesResponse, brandsResponse] =
            await Promise.all([
              fetch(`/api/products/${id}`),
              fetch("/api/categories"),
              fetch("/api/brands"),
            ]);

          const productResult = await productResponse.json();
          const categoriesResult = await categoriesResponse.json();
          const brandsResult = await brandsResponse.json();

          let fetchedCategories: Category[] = [];
          if (categoriesResult.success) {
            fetchedCategories = categoriesResult.data;
            setCategories(fetchedCategories);
          } else {
            toast.error("Erro ao buscar categorias.");
          }

          if (productResult.success) {
            const prodData: ProductData = productResult.data;
            setProduct(prodData);

            // Resolver Categoria Principal e Subcategoria com base nos dados carregados
            if (prodData.categoryId && fetchedCategories.length > 0) {
              const currentCategory = fetchedCategories.find(
                (c) => c.id === prodData.categoryId
              );

              if (currentCategory) {
                if (currentCategory.parentId) {
                  // É uma subcategoria
                  setSelectedMainCategoryId(currentCategory.parentId);
                  setSelectedSubcategoryId(currentCategory.id);
                } else {
                  // É uma categoria principal
                  setSelectedMainCategoryId(currentCategory.id);
                  setSelectedSubcategoryId("");
                }
              }
            }
          } else {
            toast.error(productResult.error || "Produto não encontrado.");
            router.push("/dashboard/products");
          }

          if (brandsResult.success) {
            setBrands(brandsResult.data);
          } else {
            toast.error("Erro ao buscar marcas.");
          }
        } catch {
          toast.error("Erro de conexão ao buscar dados.");
        } finally {
          setLoading(false);
        }
      };
      fetchProductAndData();
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

  const handleMainCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedMainCategoryId(value);
    setSelectedSubcategoryId(""); // Limpa subcategoria ao trocar de categoria principal
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubcategoryId(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    // Categoria final enviada ao backend: subcategoria se selecionada, senão a principal
    const finalCategoryId = selectedSubcategoryId || selectedMainCategoryId || null;

    setLoading(true);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...product,
          categoryId: finalCategoryId,
        }),
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
    return <LoadingState label="Carregando produto..." className="min-h-[50vh]" />;
  }

  if (!product) {
    return <div className="p-8">Produto não encontrado.</div>;
  }

  // Filtrar categorias principais e subcategorias aplicáveis
  const mainCategories = categories.filter((c) => !c.parentId);
  const availableSubcategories = selectedMainCategoryId
    ? categories.filter((c) => c.parentId === selectedMainCategoryId)
    : [];

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="mb-2">
                  Preço
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="mainCategoryId" className="mb-2">
                  Categoria Principal
                </Label>
                <select
                  id="mainCategoryId"
                  name="mainCategoryId"
                  value={selectedMainCategoryId}
                  onChange={handleMainCategoryChange}
                  className="w-full p-2 border border-input rounded-md bg-background"
                >
                  <option value="">Selecione uma categoria principal</option>
                  {mainCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="subcategoryId" className="mb-2">
                  Subcategoria
                </Label>
                <select
                  id="subcategoryId"
                  name="subcategoryId"
                  value={selectedSubcategoryId}
                  onChange={handleSubcategoryChange}
                  disabled={!selectedMainCategoryId || availableSubcategories.length === 0}
                  className="w-full p-2 border border-input rounded-md bg-background disabled:opacity-50"
                >
                  <option value="">
                    {!selectedMainCategoryId
                      ? "Selecione a Categoria Principal primeiro"
                      : availableSubcategories.length === 0
                      ? "Sem subcategorias vinculadas"
                      : "Nenhuma (Apenas Categoria Principal)"}
                  </option>
                  {availableSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="brandId" className="mb-2">
                Marca
              </Label>
              <select
                id="brandId"
                name="brandId"
                value={product.brandId || ""}
                onChange={handleChange}
                className="w-full p-2 border border-input rounded-md bg-background"
              >
                <option value="">Selecione uma marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
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
                variant="outline"
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

