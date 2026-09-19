"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Category } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  /** Quantidade de subcategorias filhas (0 para main sem filhos ou para sub) */
  subcategoryCount: number;
  onSuccess: () => void;
}

export function DeleteCategoryModal({
  open,
  onOpenChange,
  category,
  subcategoryCount,
  onSuccess,
}: DeleteCategoryModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!category) return null;

  const isSub = Boolean(category.parentId);
  const hasCascade = !isSub && subcategoryCount > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(
          `${isSub ? "Subcategoria" : "Categoria"} "${category.name}" excluída com sucesso!`
        );
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Ocorreu um erro ao excluir. Tente novamente.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Confirmar Exclusão
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p>
                Você está prestes a excluir{" "}
                <span className="font-semibold text-foreground">
                  &ldquo;{category.name}&rdquo;
                </span>
                . Esta ação não pode ser desfeita.
              </p>

              {hasCascade && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    ⚠️ Atenção: exclusão em cascata
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Esta categoria possui{" "}
                    <strong>
                      {subcategoryCount}{" "}
                      {subcategoryCount === 1 ? "subcategoria vinculada" : "subcategorias vinculadas"}
                    </strong>
                    . Ao excluir, todas as subcategorias também serão removidas permanentemente.
                  </p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Excluindo..." : hasCascade ? "Excluir tudo" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
