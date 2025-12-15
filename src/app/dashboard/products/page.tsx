"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Eye, Trash2, Edit } from "lucide-react";
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
import { useSearchParams } from "next/navigation";

import CategoryFilter from "@/components/ui/CategoryFilter";
import BrandFilter from "@/components/ui/BrandFilter";
import ProductForm from "./_components/ProductForm";
import { Category, Brand } from "@/lib/types";

interface Product {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  condition: string;
  categoryId?: string;
  category?: Category;
  brandId?: string;
  brand?: Brand;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
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

  const fetchProducts = useCallback(
    async (
      page: number,
      categoryId?: string,
      brandId?: string,
      search?: string
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
    [limit]
  );

  // Efeito para buscar produtos quando a página, filtros, busca ou limite mudar
  useEffect(() => {
    fetchProducts(currentPage, selectedCategory, selectedBrand, searchTerm);
  }, [
    currentPage,
    selectedCategory,
    selectedBrand,
    limit,
    searchTerm,
    fetchProducts,
  ]);

  // Efeito para resetar a página para 1 quando os filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand, searchTerm]);

  const handleProductAdded = () => {
    fetchProducts(currentPage, selectedCategory, selectedBrand, searchTerm);
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
      <h1 className="md:text-3xl text-2xl font-bold mb-6">
        Gerenciar Produtos
      </h1>

      <ProductForm
        categories={categories}
        brands={brands}
        onProductAdded={handleProductAdded}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between items-start gap-4">
            <CardTitle>Todos os Produtos</CardTitle>
            <div className="flex flex-col items-start gap-4 w-full border border-primary/40 rounded-md p-4">
              <p>Filtros</p>
              {/* Busca */}
              <div className="w-full">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Buscar por produtos..."
                />
              </div>
              {/* Filtro de Categoria */}
              <div className="w-full">
                <CategoryFilter
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  categories={categories}
                  className="w-full"
                />
              </div>
              {/* Filtro de Marca */}
              <div className="w-full">
                <BrandFilter
                  value={selectedBrand}
                  onChange={setSelectedBrand}
                  brands={brands}
                  className="w-full"
                />
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
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">ID</TableHead>
                      <TableHead className="min-w-[200px]">Título</TableHead>
                      <TableHead className="min-w-[120px]">Preço</TableHead>
                      <TableHead className="min-w-[100px]">
                        Quantidade
                      </TableHead>
                      <TableHead className="min-w-[150px]">Categoria</TableHead>
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
                          <div
                            className="max-w-[490px] truncate"
                            title={product.title}
                          >
                            {product.title}
                          </div>
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
                            title={product.category?.name || "N/A"}
                          >
                            {product.category ? product.category.name : "N/A"}
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
    </div>
  );
}
