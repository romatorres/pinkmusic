"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { Eye, Trash2, Edit, PackagePlus, Store, ShoppingCart } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { LoadingState } from "@/components/ui/loading-state";
import { useSearchParams } from "next/navigation";

import CategoryFilter from "@/components/site/_components/CategoryFilter";
import BrandFilter from "@/components/site/_components/BrandFilter";
import { ProductFormModal } from "./_components/ProductFormModal";
import { LocalProductModal } from "./_components/LocalProductModal";
import { Category, Brand, ProductOrigin } from "@/lib/types";

interface Product {
  id: string;
  code?: string | null;
  packageSize?: "SMALL" | "MEDIUM" | "LARGE" | "XLARGE";
  title: string;
  price: number;
  available_quantity: number;
  condition: string;
  origin?: ProductOrigin;
  categoryId?: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
}

function ProductsPageContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedOrigin, setSelectedOrigin] = useState<string>("all");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [localProductModalOpen, setLocalProductModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(
    searchParams.get("search") || "",
  );
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit, setLimit] = useState(10);

  // Buscar categorias e marcas para o formulário
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Buscar marcas e categorias ao carregar a página
  useEffect(() => {
    Promise.all([
      fetch("/api/brands").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([brandsResponse, categoriesResponse]) => {
        if (brandsResponse.success) {
          setBrands(brandsResponse.data);
        } else {
          toast.error("Erro ao carregar marcas.");
        }
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data);
        } else {
          toast.error("Erro ao carregar categorias.");
        }
      })
      .catch(() => toast.error("Erro ao carregar dados"));
  }, []);

  const brandsForFilter = useMemo(() => {
    if (!selectedCategory) {
      return brands;
    }
    const category = categories.find((c) => c.id === selectedCategory);
    if (!category || !category.products) {
      return [];
    }
    const brandIdsInCategory = [
      ...new Set(category.products.map((p) => p.brandId).filter(Boolean)),
    ];
    return brands.filter((brand) => brandIdsInCategory.includes(brand.id));
  }, [selectedCategory, brands, categories]);

  const categoriesForFilter = useMemo(() => {
    if (!selectedBrand) {
      return categories;
    }
    const brand = brands.find((b) => b.id === selectedBrand);
    if (!brand || !brand.products) {
      return [];
    }
    const categoryIdsForBrand = [
      ...new Set(brand.products.map((p) => p.categoryId).filter(Boolean)),
    ];
    return categories.filter((category) =>
      categoryIdsForBrand.includes(category.id),
    );
  }, [selectedBrand, brands, categories]);

  const fetchProducts = useCallback(
    async (
      page: number,
      categoryId?: string,
      brandId?: string,
      search?: string,
      origin?: string,
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (categoryId) {
          params.append("categoryId", categoryId);
        }
        if (brandId) {
          params.append("brandId", brandId);
        }
        if (search) {
          params.append("search", search);
        }
        if (origin && origin !== "all") {
          params.append("origin", origin);
        }

        const response = await fetch(`/api/products?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setProducts(result.data.products);
          setTotalProducts(result.data.total);
        } else {
          toast.error(result.error || "Erro ao carregar produtos.");
        }
      } catch {
        toast.error("Erro de conexão ao buscar produtos.");
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  // Efeito para buscar produtos quando a página, filtros, busca, origem ou limite mudar
  useEffect(() => {
    fetchProducts(currentPage, selectedCategory, selectedBrand, searchTerm, selectedOrigin);
  }, [
    currentPage,
    selectedCategory,
    selectedBrand,
    selectedOrigin,
    limit,
    searchTerm,
    fetchProducts,
  ]);

  // Efeito para resetar a página para 1 quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand, selectedOrigin, searchTerm]);

  const handleProductAdded = () => {
    fetchProducts(currentPage, selectedCategory, selectedBrand, searchTerm, selectedOrigin);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Produto deletado com sucesso!");
        setProductToDelete(null);
        fetchProducts(currentPage, selectedCategory, selectedBrand, searchTerm);
      } else {
        toast.error(result.error || "Erro ao deletar produto.");
      }
    } catch {
      toast.error("Erro de conexão ao deletar produto.");
    }
  };

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="md:pt-8 pt-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="md:text-3xl text-2xl font-bold">Gerenciar Produtos</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setLocalProductModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Store className="h-4 w-4" />
            Novo Produto Local
          </Button>
          <Button
            onClick={() => setProductFormOpen(true)}
            variant="outline"
            className="flex-1 sm:flex-initial flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4 text-amber-500" />
            Importar do ML
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between items-start gap-4">
            <CardTitle>Todos os Produtos</CardTitle>
            <div className="flex flex-col items-start gap-4 w-full border border-primary/40 rounded-md p-4">
              <p>Filtros</p>
              {/* Busca */}
              <div className="w-full">
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={(value) => {
                    setSearchTerm(value.trim());
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar por título ou código fiscal..."
                />
              </div>
              {/* Filtro de Categoria */}
              <div className="w-full">
                <CategoryFilter
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  categories={categoriesForFilter}
                  className="w-full"
                />
              </div>
              {/* Filtro de Marca */}
              <div className="w-full">
                <BrandFilter
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  brands={brandsForFilter}
                  className="w-full"
                />
              </div>

              {/* Filtro de Origem / Canal */}
              <div className="flex flex-col lg:flex-row gap-2 w-full">
                <Label
                  htmlFor="origin-select"
                  className="text-start whitespace-nowrap"
                >
                  Origem do Produto:
                </Label>
                <Select
                  value={selectedOrigin}
                  onValueChange={(newValue) => {
                    setSelectedOrigin(newValue);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="origin-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os produtos</SelectItem>
                    <SelectItem value="LOCAL">🟢 Estoque Local / Balcão</SelectItem>
                    <SelectItem value="MERCADO_LIVRE">🟡 Mercado Livre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Itens por página */}
              <div className="flex flex-col lg:flex-row gap-2 w-full">
                <Label
                  htmlFor="limit-select"
                  className="text-start whitespace-nowrap"
                >
                  Itens por página:
                </Label>
                <Select
                  value={String(limit)}
                  onValueChange={(newValue) => {
                    setLimit(Number(newValue));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="limit-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState
              label="Carregando produtos..."
              className="min-h-[220px]"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">ID</TableHead>
                      <TableHead className="min-w-[200px]">Título</TableHead>
                      <TableHead className="min-w-[120px]">Origem</TableHead>
                      <TableHead className="min-w-[120px]">Preço</TableHead>
                      <TableHead className="min-w-[100px]">
                        Quantidade
                      </TableHead>
                      <TableHead className="min-w-[150px]">Categoria</TableHead>
                      <TableHead className="min-w-[150px]">
                        Subcategoria
                      </TableHead>
                      <TableHead className="min-w-[150px]">Marca</TableHead>
                      <TableHead className="min-w-[120px] text-right">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono text-sm truncate max-w-[100px]">
                          {product.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col gap-1 max-w-[490px]">
                            <span className="truncate font-semibold text-foreground" title={product.title}>
                              {product.title}
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {product.code && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Cód: {product.code}
                                </span>
                              )}
                              {product.packageSize && (
                                <span
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1"
                                  title={
                                    product.packageSize === "SMALL"
                                      ? "Porte Pequeno (Prioriza Moto)"
                                      : product.packageSize === "LARGE" || product.packageSize === "XLARGE"
                                      ? "Porte Grande (Porta-malas de Carro)"
                                      : "Porte Médio (Moto/Carro)"
                                  }
                                >
                                  {product.packageSize === "SMALL"
                                    ? "🛵 Moto"
                                    : product.packageSize === "LARGE" || product.packageSize === "XLARGE"
                                    ? "🚗 Carro"
                                    : "📦 Médio"}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {product.origin === "LOCAL" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <Store className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              Local
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                              <ShoppingCart className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              Mercado Livre
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(product.price)}
                        </TableCell>
                        <TableCell className="text-center">
                          {product.available_quantity}
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[150px] truncate"
                            title={
                              product.category?.parent?.name ||
                              product.category?.name ||
                              "N/A"
                            }
                          >
                            {product.category?.parent?.name ||
                              product.category?.name ||
                              "N/A"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[150px] truncate"
                            title={
                              product.category?.parent
                                ? product.category.name
                                : "—"
                            }
                          >
                            {product.category?.parent
                              ? product.category.name
                              : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-[150px] truncate"
                            title={product.brand?.name || "N/A"}
                          >
                            {product.brand ? product.brand.name : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/products/${product.id}`}
                              target="_blank"
                            >
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link
                              href={`/dashboard/products/${product.id}/edit`}
                            >
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>

                            <Dialog
                              open={productToDelete === product.id}
                              onOpenChange={(open) => {
                                if (!open) setProductToDelete(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={loading}
                                  onClick={() => setProductToDelete(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Confirmar Exclusão</DialogTitle>
                                  <DialogDescription>
                                    Tem certeza que deseja deletar este produto?
                                    Esta ação não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => setProductToDelete(null)}
                                    disabled={loading}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() =>
                                      handleDeleteProduct(product.id)
                                    }
                                    disabled={loading}
                                  >
                                    {loading ? "Deletando..." : "Deletar"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de adição de produto ML */}
      <ProductFormModal
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        categories={categories}
        brands={brands}
        onSuccess={handleProductAdded}
      />

      {/* Modal de cadastro de produto local */}
      <LocalProductModal
        open={localProductModalOpen}
        onOpenChange={setLocalProductModalOpen}
        categories={categories}
        brands={brands}
        onSuccess={handleProductAdded}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando produtos...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
