"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import ProductDetails from "@/components/site/Products/ProductDetails";
import { LoadingState } from "@/components/ui/loading-state";
import { ArrowLeft, SearchX, AlertCircle } from "lucide-react";
import { useProductStore } from "@/store/productStore";
import type { Product } from "@/lib/types";
import { extractProductId, createProductSlug } from "@/lib/slug";
import { PageContainer } from "@/components/ui/Page-container";
import { Button } from "@/components/ui/button";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id: rawParam } = use(params);
  const id = extractProductId(rawParam);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const { getProductById, updateProduct } = useProductStore();

  useEffect(() => {
    if (id) {
      const fetchProductDetails = async () => {
        // Tenta pegar do store primeiro para uma exibição rápida
        const productFromStore = getProductById(id);
        if (productFromStore) {
          setProduct(productFromStore);
          setLoading(false);
        } else {
          setLoading(true);
        }

        setError("");
        try {
          const response = await fetch(`/api/products/${id}`);
          const result: ApiResponse<Product> = await response.json();

          if (result.success && result.data) {
            setProduct(result.data);
            updateProduct(result.data);

            // Se o usuário entrou pelo link antigo sem slug, atualiza a URL suavemente para a versão amigável
            if (typeof window !== "undefined" && !rawParam.includes("--") && result.data.title) {
              const friendlySlug = createProductSlug(result.data.title, result.data.id);
              window.history.replaceState(null, "", `/products/${friendlySlug}`);
            }
          } else {
            setError(result.error || "Erro ao carregar detalhes do produto");
          }
        } catch {
          setError("Erro de conexão ao buscar detalhes do produto");
        } finally {
          setLoading(false);
        }
      };
      fetchProductDetails();
    }
  }, [id, rawParam, getProductById, updateProduct]);

  if (loading) {
    return <LoadingState label="Carregando produto..." size="lg" fullHeight />;
  }

  if (error) {
    return (
      <PageContainer className="py-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Não foi possível carregar</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button
              onClick={() => router.push("/products-all")}
            >
              Ver todos os produtos
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer className="py-16">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <SearchX className="size-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Produto não encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O item que você está procurando pode ter sido removido ou está temporariamente indisponível.
          </p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="gap-2"
            >
              <ArrowLeft className="size-4" /> Voltar
            </Button>
            <Button
              onClick={() => router.push("/products-all")}
            >
              Ver todos os produtos
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return <ProductDetails product={product} />;
}
