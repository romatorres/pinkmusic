"use client";

import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useSearchParams } from "next/navigation";

import CategoryFilter from "@/components/ui/CategoryFilter";
import { Category } from "@/lib/types";

interface Product {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  condition: string;
  categoryId?: string;
  category?: Category;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || ""
  );

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchProducts = async (
    page: number,
    categoryId?: string,
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
  };

  // Efeito para buscar produtos quando a página, filtro, busca ou limite mudar
  useEffect(() => {
    fetchProducts(currentPage, selectedCategory, searchTerm);
  }, [currentPage, selectedCategory, limit, searchTerm]);

  // Efeito para resetar a página para 1 quando o filtro de categoria ou busca mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm]);

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
          categoryId: selectedCategory || null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Produto adicionado com sucesso!");
        setProductId("");
        fetchProducts(currentPage, selectedCategory, searchTerm); // Refresh a lista
      } else if (response.status === 409) {
        // Produto duplicado
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

  const getPlaceholder = () => {
    return "Buscar por produtos...";
  };

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">
        Gerenciar Produtos
      </h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Adicionar Novo Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubmit}>
            <div className="flex md:flex-row flex-col gap-4 md:items-end items-start ">
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
              <Button
                type="submit"
                disabled={isAdding}
                className="md:w-auto w-full"
              >
                {isAdding ? "Adicionando..." : "Adicionar Produto"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between items-start gap-4">
            <CardTitle>Todos os Produtos</CardTitle>
            <div className="flex lg:flex-row flex-col items-start md:items-center gap-4 w-full">
              {/* Filtro de Categoria: */}
              <div className="w-full">
                <CategoryFilter
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  className="w-full "
                />
              </div>
              {/* Filtro de Produtos: */}
              <div className="w-full">
                <SearchInput
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={getPlaceholder()}
                />
              </div>
              {/* Select Itens por pagina */}
              <div className="flex flex-col lg:flex-row items-center gap-2 w-full">
                <Label
                  htmlFor="limit-select"
                  className="text-start whitespace-nowrap"
                >
                  Itens por página:
                </Label>
                <select
                  id="limit-select"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1); // Reseta para página 1 ao mudar o limite
                  }}
                  className="p-2 border border-foreground rounded w-full"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
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
                                    onClick={async () => {
                                      try {
                                        const response = await fetch(
                                          `/api/products/${product.id}`,
                                          {
                                            method: "DELETE",
                                          }
                                        );
                                        const result = await response.json();
                                        if (response.ok && result.success) {
                                          toast.success(
                                            "Produto deletado com sucesso!"
                                          );
                                          setProductToDelete(null);
                                          fetchProducts(
                                            currentPage,
                                            selectedCategory,
                                            searchTerm
                                          );
                                        } else {
                                          toast.error(
                                            result.error ||
                                              "Erro ao deletar produto."
                                          );
                                        }
                                      } catch {
                                        toast.error(
                                          "Erro de conexão ao deletar produto."
                                        );
                                      }
                                    }}
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
