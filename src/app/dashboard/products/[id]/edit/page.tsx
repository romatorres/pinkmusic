"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState } from "@/components/ui/loading-state";
import { toast } from "sonner";
import { Category, Brand } from "@/lib/types";
import { Upload, ImageIcon, Store, ShoppingCart, Loader2 } from "lucide-react";

interface ProductData {
  id?: string;
  code?: string | null;
  packageSize?: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";
  title: string;
  price: number;
  available_quantity: number;
  categoryId: string | null;
  brandId: string | null;
  origin?: "MERCADO_LIVRE" | "LOCAL";
  description?: string | null;
  descriptionSource?: "CUSTOM" | "ML" | null;
  isLocalPickup?: boolean;
  thumbnail?: string;
  permalink?: string | null;
  condition?: string;
}

export default function EditProductPage() {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedMainCategoryId, setSelectedMainCategoryId] =
    useState<string>("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] =
    useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  // Estados de Imagem
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
            setProduct({
              ...prodData,
              descriptionSource:
                prodData.descriptionSource ||
                (prodData.origin === "LOCAL" ? "CUSTOM" : "ML"),
            });

            // Resolver Categoria Principal e Subcategoria com base nos dados carregados
            if (prodData.categoryId && fetchedCategories.length > 0) {
              const currentCategory = fetchedCategories.find(
                (c) => c.id === prodData.categoryId,
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setProduct((prev) =>
      prev
        ? {
          ...prev,
          [name]:
            name === "price" || name === "available_quantity"
              ? parseFloat(value) || 0
              : value,
        }
        : null,
    );
  };

  const handleMainCategoryChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const value = e.target.value;
    setSelectedMainCategoryId(value);
    setSelectedSubcategoryId("");
  };

  const handleSubcategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSubcategoryId(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setSaving(true);

    let finalThumbnail = product.thumbnail || "";

    try {
      // 1. Se foi selecionado um novo arquivo de imagem, envia para o Cloudinary primeiro
      if (selectedFile) {
        setUploadStatus("Enviando nova imagem para o Cloudinary...");
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(
            uploadData.error || "Falha no upload da imagem para o Cloudinary.",
          );
        }

        finalThumbnail = uploadData.url;
      }

      setUploadStatus("Salvando alterações do produto...");

      const finalCategoryId =
        selectedSubcategoryId || selectedMainCategoryId || null;

      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: product.code ? product.code.trim() : null,
          packageSize: product.packageSize || "SMALL",
          title: product.title,
          price: product.price,
          available_quantity: product.available_quantity,
          categoryId: finalCategoryId,
          brandId: product.brandId || null,
          origin: product.origin || "MERCADO_LIVRE",
          description: product.description || null,
          descriptionSource: product.descriptionSource || "CUSTOM",
          isLocalPickup: Boolean(product.isLocalPickup),
          permalink: product.permalink || null,
          thumbnail: finalThumbnail,
          condition: product.condition || "new",
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Produto atualizado com sucesso!");
        router.push("/dashboard/products");
      } else {
        toast.error(result.error || "Erro ao atualizar produto.");
      }
    } catch (error) {
      console.error("Erro ao atualizar produto:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro de conexão ao atualizar produto.",
      );
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  };

  const handleCancel = () => {
    router.push("/dashboard/products");
  };

  if (loading) {
    return (
      <LoadingState label="Carregando produto..." className="min-h-[50vh]" />
    );
  }

  if (!product) {
    return <div className="p-8">Produto não encontrado.</div>;
  }

  const mainCategories = categories.filter((c) => !c.parentId);
  const availableSubcategories = selectedMainCategoryId
    ? categories.filter((c) => c.parentId === selectedMainCategoryId)
    : [];

  const isLocal = product.origin === "LOCAL";

  return (
    <div className="md:pt-8 pt-12 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="md:text-3xl text-2xl font-bold">Editar Produto</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie preço, estoque, fotos, canal de venda e descrições.
          </p>
        </div>

        {/* Badge da Origem */}
        <div>
          {isLocal ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              Estoque Local / Balcão
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              <ShoppingCart className="h-3.5 w-3.5 text-amber-600" />
              Mercado Livre
            </span>
          )}
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Informações do Produto</CardTitle>
          <CardDescription>
            Campos atualizados refletirão imediatamente na vitrine e no cálculo
            de estoque.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título e Código Fiscal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title" className="mb-2 block font-semibold">
                  Título do Produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  type="text"
                  value={product.title}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>

              <div>
                <Label htmlFor="code" className="mb-2 flex items-center justify-between font-semibold">
                  <span>Código Fiscal / SKU</span>
                  <span className="text-xs font-normal text-muted-foreground">Sistema da Loja</span>
                </Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Ex: 10425"
                  value={product.code || ""}
                  onChange={handleChange}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Porte do Produto (Uber Direct) */}
            <div className="border rounded-xl p-4 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 space-y-2">
              <Label htmlFor="packageSize" className="font-semibold text-sm flex items-center gap-2 text-purple-900 dark:text-purple-200">
                <span>🛵 / 🚗 Transporte Uber Direct (Tamanho do Pacote)</span>
              </Label>
              <select
                id="packageSize"
                name="packageSize"
                value={product.packageSize || "SMALL"}
                onChange={handleChange}
                className="w-full p-2.5 border border-purple-200 dark:border-purple-800 rounded-md bg-background text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                disabled={saving}
              >
                <option value="SMALL">
                  🛵 Pequeno (Moto) — Cordas, palhetas, afinadores, cabos, pedais (cabe na mochila do entregador)
                </option>
                <option value="MEDIUM">
                  📦 Médio (Moto/Carro) — Acessórios médios, caixas pequenas
                </option>
                <option value="LARGE">
                  🚗 Grande (Carro) — Violões, guitarras, baixos, teclados, amplificadores (porta-malas)
                </option>
                <option value="XLARGE">
                  🚚 Muito Grande (Carro/Utilitário) — Baterias, caixas acústicas grandes
                </option>
              </select>
              <p className="text-xs text-muted-foreground">
                Orienta o algoritmo da Uber Direct a priorizar motoboys para itens pequenos ou exigir porta-malas de carro para instrumentos grandes.
              </p>
            </div>

            {/* Imagem do Produto com Preview e Upload Cloudinary */}
            <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
              <Label className="font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" /> Imagem Principal
                do Produto
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Preview Atual */}
                <div className="flex flex-col items-center justify-center p-2 border rounded-lg bg-background min-h-[140px]">
                  {imagePreview ? (
                    <div className="relative w-28 h-28">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview da imagem"
                        className="w-full h-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center">
                      Sem imagem
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground mt-1">
                    {selectedFile ? "Nova imagem selecionada" : "Imagem atual"}
                  </span>
                </div>

                {/* Opções de Upload ou URL */}
                <div className="sm:col-span-2 space-y-3">
                  <div>
                    <label
                      htmlFor="edit-image-file"
                      className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-xs font-medium text-foreground">
                        Trocar foto pelo computador (sobe para o Cloudinary)
                      </span>
                      <input
                        id="edit-image-file"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={saving}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Ou informe o link direto da imagem:
                    </span>
                    <Input
                      type="url"
                      name="thumbnail"
                      placeholder="https://..."
                      value={selectedFile ? "" : product.thumbnail || ""}
                      onChange={(e) => {
                        setSelectedFile(null);
                        setImagePreview(e.target.value);
                        handleChange(e);
                      }}
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="mb-2 block font-semibold">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={product.price}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div>
                <Label
                  htmlFor="available_quantity"
                  className="mb-2 block font-semibold"
                >
                  Quantidade em Estoque <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="available_quantity"
                  name="available_quantity"
                  type="number"
                  min="0"
                  value={product.available_quantity}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            {/* Categoria e Subcategoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="mainCategoryId"
                  className="mb-2 block font-semibold"
                >
                  Categoria Principal
                </Label>
                <select
                  id="mainCategoryId"
                  name="mainCategoryId"
                  value={selectedMainCategoryId}
                  onChange={handleMainCategoryChange}
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm"
                  disabled={saving}
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
                <Label
                  htmlFor="subcategoryId"
                  className="mb-2 block font-semibold"
                >
                  Subcategoria
                </Label>
                <select
                  id="subcategoryId"
                  name="subcategoryId"
                  value={selectedSubcategoryId}
                  onChange={handleSubcategoryChange}
                  disabled={
                    !selectedMainCategoryId ||
                    availableSubcategories.length === 0 ||
                    saving
                  }
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm disabled:opacity-50"
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

            {/* Marca e Origem */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="brandId" className="mb-2 block font-semibold">
                  Marca
                </Label>
                <select
                  id="brandId"
                  name="brandId"
                  value={product.brandId || ""}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm"
                  disabled={saving}
                >
                  <option value="">Selecione uma marca</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="origin" className="mb-2 block font-semibold">
                  Canal / Origem do Produto
                </Label>
                <select
                  id="origin"
                  name="origin"
                  value={product.origin || "MERCADO_LIVRE"}
                  onChange={handleChange}
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm"
                  disabled={saving}
                >
                  <option value="LOCAL">🟢 Estoque Local / Balcão</option>
                  <option value="MERCADO_LIVRE">🟡 Mercado Livre</option>
                </select>
              </div>
            </div>

            {/* Link do Mercado Livre (se aplicável) */}
            <div>
              <Label htmlFor="permalink" className="mb-2 block font-semibold">
                Link do Mercado Livre (opcional)
              </Label>
              <Input
                id="permalink"
                name="permalink"
                type="url"
                placeholder="https://produto.mercadolivre.com.br/MLB..."
                value={product.permalink || ""}
                onChange={handleChange}
                disabled={saving}
              />
              <span className="text-[11px] text-muted-foreground mt-1 block">
                Se preenchido, os clientes poderão comprar também através do
                Mercado Livre.
              </span>
            </div>

            {/* Descrição do Produto */}
            <div className="space-y-3">
              <div>
                <Label
                  htmlFor="descriptionSource"
                  className="mb-2 block font-semibold"
                >
                  Fonte da descrição exibida
                </Label>
                <select
                  id="descriptionSource"
                  name="descriptionSource"
                  value={
                    product.descriptionSource ||
                    (product.origin === "LOCAL" ? "CUSTOM" : "ML")
                  }
                  onChange={(e) =>
                    setProduct((prev) =>
                      prev
                        ? {
                          ...prev,
                          descriptionSource: e.target.value as
                            | "CUSTOM"
                            | "ML",
                        }
                        : null,
                    )
                  }
                  className="w-full p-2.5 border border-input rounded-md bg-background text-sm"
                  disabled={saving}
                >
                  <option value="CUSTOM">
                    🟢 Descrição personalizada da loja
                  </option>
                  <option value="ML">
                    🟡 Descrição do catálogo do Mercado
                    Livre
                  </option>
                </select>
              </div>

              {(product.descriptionSource === "CUSTOM" ||
                product.origin === "LOCAL") && (
                  <div>
                    <Label
                      htmlFor="description"
                      className="mb-2 block font-semibold"
                    >
                      Descrição Detalhada do Produto
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Escreva as características, detalhes técnicos, medidas ou informações de garantia..."
                      value={product.description || ""}
                      onChange={handleChange}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={saving}
                    />
                  </div>
                )}
            </div>

            {/* Retirada na Loja */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox
                id="isLocalPickup"
                checked={product.isLocalPickup ?? true}
                onCheckedChange={(checked) =>
                  setProduct((prev) =>
                    prev ? { ...prev, isLocalPickup: Boolean(checked) } : null,
                  )
                }
                disabled={saving}
              />
              <Label
                htmlFor="isLocalPickup"
                className="text-sm cursor-pointer font-medium"
              >
                Disponível para retirada imediata no balcão da loja física (Pink
                Music)
              </Label>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col md:flex-row gap-4 pt-4 border-t">
              <Button
                type="submit"
                className="md:w-auto w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? uploadStatus || "Salvando..." : "Salvar Alterações"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="md:w-auto w-full px-10"
                onClick={handleCancel}
                disabled={saving}
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
