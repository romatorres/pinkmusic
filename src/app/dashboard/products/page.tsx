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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Pagination from "@/components/ui/Pagination"; // Importando o componente

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

const ProductsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // State para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit, setLimit] = useState(10);

  const fetchProducts = async (page: number, categoryId?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (categoryId) {
        params.append("categoryId", categoryId);
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

  // Efeito para buscar categorias (executa uma vez)

  // Efeito para buscar produtos quando a página, filtro ou limite mudar
  useEffect(() => {
    fetchProducts(currentPage, selectedCategory);
  }, [currentPage, selectedCategory, limit]);

  // Efeito para resetar a página para 1 quando o filtro de categoria mudar
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

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
        fetchProducts(currentPage, selectedCategory); // Refresh a lista
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

  const handleDelete = async (productId: string) => {
    if (!confirm("Tem certeza que deseja deletar este produto?")) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Produto deletado com sucesso!");
        fetchProducts(currentPage, selectedCategory); // Refresh a lista
      } else {
        toast.error(result.error || "Erro ao deletar produto.");
      }
    } catch {
      toast.error("Erro de conexão ao deletar produto.");
    }
  };

  const getConditionText = (condition: string) => {
    const conditions: { [key: string]: string } = {
      new: "Novo",
      used: "Usado",
      not_specified: "Não especificado",
    };
    return conditions[condition] || condition;
  };

  const totalPages = Math.ceil(totalProducts / limit);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Gerenciar Produtos</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Adicionar Novo Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddSubmit} className="flex items-end gap-4">
            <div className="flex-grow">
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
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adicionando..." : "Adicionar Produto"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Todos os Produtos</CardTitle>
            <div className="flex items-center gap-4">
              <div>
                <CategoryFilter
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  className="w-full px-3 py-2 border rounded border-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="limit-select">Itens por página:</Label>
                <select
                  id="limit-select"
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setCurrentPage(1); // Reseta para página 1 ao mudar o limite
                  }}
                  className="p-2 border rounded"
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Condição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.id}</TableCell>
                      <TableCell className="font-medium">
                        {product.title}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(product.price)}
                      </TableCell>
                      <TableCell>{product.available_quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getConditionText(product.condition)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {product.category ? product.category.name : "N/A"}
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
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
};

export default ProductsPage;
