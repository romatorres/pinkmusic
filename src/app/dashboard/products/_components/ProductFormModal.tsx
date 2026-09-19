"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Category, Brand } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  brands: Brand[];
  /** Chamado após produto adicionado com sucesso para reload da listagem */
  onSuccess: () => void;
}

export function ProductFormModal({
  open,
  onOpenChange,
  categories,
  brands,
  onSuccess,
}: ProductFormModalProps) {
  const [productId, setProductId] = useState("");
  const [formMainCategory, setFormMainCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const mainCategories = categories.filter((c) => !c.parentId);

  const availableSubcategories =
    formMainCategory && formMainCategory !== "none"
      ? categories.filter((c) => c.parentId === formMainCategory)
      : [];

  const handleMainCategoryChange = (val: string) => {
    setFormMainCategory(val);
    setFormSubCategory(""); // Limpa subcategoria ao trocar a principal
  };

  const handleClose = () => {
    if (isAdding) return;
    // Limpa o form ao fechar
    setProductId("");
    setFormMainCategory("");
    setFormSubCategory("");
    setFormBrand("");
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId.trim()) {
      toast.error("Por favor, insira um ID de produto.");
      return;
    }

    setIsAdding(true);

    const finalCategoryId =
      formSubCategory && formSubCategory !== "none"
        ? formSubCategory
        : formMainCategory && formMainCategory !== "none"
        ? formMainCategory
        : null;

    try {
      const response = await fetch("/api/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId.trim(),
          categoryId: finalCategoryId,
          brandId: formBrand && formBrand !== "none" ? formBrand : null,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Produto adicionado com sucesso!");
        onSuccess();
        handleClose();
      } else if (response.status === 409) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Adicionar Novo Produto
          </DialogTitle>
          <DialogDescription>
            Insira o ID do produto do Mercado Livre e configure categoria e marca opcionalmente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0">
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            {/* ID do Produto */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-productId">
                ID do Produto no Mercado Livre{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="modal-productId"
                type="text"
                placeholder="Ex: MLB123456789"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Categoria Principal */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-mainCategory">
                Categoria Principal{" "}
                <span className="text-muted-foreground text-xs">(Opcional)</span>
              </Label>
              <Select
                onValueChange={handleMainCategoryChange}
                value={formMainCategory || "none"}
              >
                <SelectTrigger id="modal-mainCategory" className="w-full">
                  <SelectValue placeholder="Selecione a categoria principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {mainCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategoria */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-subCategory">
                Subcategoria{" "}
                <span className="text-muted-foreground text-xs">(Opcional)</span>
              </Label>
              <Select
                onValueChange={setFormSubCategory}
                value={formSubCategory || "none"}
                disabled={
                  !formMainCategory ||
                  formMainCategory === "none" ||
                  availableSubcategories.length === 0
                }
              >
                <SelectTrigger id="modal-subCategory" className="w-full">
                  <SelectValue
                    placeholder={
                      !formMainCategory || formMainCategory === "none"
                        ? "Selecione uma Categoria primeiro"
                        : availableSubcategories.length === 0
                        ? "Sem subcategorias cadastradas"
                        : "Selecione uma subcategoria"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (Usar Categoria Principal)</SelectItem>
                  {availableSubcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Marca */}
            <div className="space-y-1.5">
              <Label htmlFor="modal-brand">
                Marca{" "}
                <span className="text-muted-foreground text-xs">(Opcional)</span>
              </Label>
              <Select
                onValueChange={setFormBrand}
                value={formBrand || "none"}
              >
                <SelectTrigger id="modal-brand" className="w-full">
                  <SelectValue placeholder="Selecione uma marca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isAdding}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isAdding}>
              {isAdding ? "Adicionando..." : "Adicionar Produto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
