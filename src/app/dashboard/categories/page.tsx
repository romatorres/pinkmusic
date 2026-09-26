"use client";

import { useState, useEffect } from "react";
import { Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, FolderTree, Tag, Plus } from "lucide-react";
import { toast } from "sonner";

import { CategoryFormModal } from "./_components/CategoryFormModal";
import { DeleteCategoryModal } from "./_components/DeleteCategoryModal";

// ─── Tipos de estado dos modais ───────────────────────────────────────────────

type FormModalState =
  | { open: false }
  | { open: true; mode: "main" | "sub"; category?: Category };

type DeleteModalState =
  | { open: false }
  | { open: true; category: Category };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"main" | "sub">("main");

  // Estado dos modais — completamente isolados
  const [formModal, setFormModal] = useState<FormModalState>({ open: false });
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ open: false });

  const loadCategories = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((response: { success: boolean; data: Category[] }) => {
        if (response.success) {
          setCategories(response.data);
        } else {
          toast.error("Erro ao carregar categorias.");
        }
      });
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => !!c.parentId);

  const sortCategories = (list: Category[]) =>
    [...list].sort((a, b) => a.name.localeCompare(b.name));

  // ─── Handlers de modal ───────────────────────────────────────────────────

  const openNewMain = () => setFormModal({ open: true, mode: "main" });
  const openNewSub = () => setFormModal({ open: true, mode: "sub" });
  const openEditMain = (cat: Category) => setFormModal({ open: true, mode: "main", category: cat });
  const openEditSub = (cat: Category) => setFormModal({ open: true, mode: "sub", category: cat });

  const openDeleteMain = (cat: Category) => setDeleteModal({ open: true, category: cat });
  const openDeleteSub = (cat: Category) => setDeleteModal({ open: true, category: cat });

  const closeFormModal = () => setFormModal({ open: false });
  const closeDeleteModal = () => setDeleteModal({ open: false });

  // ─── Dados derivados para os modais ──────────────────────────────────────

  const deleteSubcategoryCount =
    deleteModal.open
      ? categories.filter((c) => c.parentId === deleteModal.category.id).length
      : 0;

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="md:text-3xl text-2xl font-bold">Categorias &amp; Subcategorias</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seu catálogo separando categorias principais e subcategorias.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg self-start md:self-auto">
          <Button
            type="button"
            variant={activeTab === "main" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("main")}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            Categorias Principais ({mainCategories.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "sub" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sub")}
            className="flex items-center gap-2"
          >
            <FolderTree className="h-4 w-4" />
            Subcategorias ({subCategories.length})
          </Button>
        </div>
      </div>

      {/* ─── Tabela Categorias Principais ──────────────────────────────────── */}
      {activeTab === "main" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Categorias Principais</CardTitle>
            <Button size="sm" onClick={openNewMain} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Categoria
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Subcategorias</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortCategories(mainCategories).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Tag className="h-8 w-8 opacity-30" />
                        <span>Nenhuma categoria principal cadastrada.</span>
                        <Button variant="outline" size="sm" onClick={openNewMain}>
                          Criar a primeira categoria
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortCategories(mainCategories).map((cat) => {
                    const childCount = categories.filter((c) => c.parentId === cat.id).length;
                    return (
                      <TableRow key={cat.id}>
                        <TableCell className="font-semibold">{cat.name}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {cat.slug || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {childCount} {childCount === 1 ? "subcategoria" : "subcategorias"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => openEditMain(cat)}
                              variant="ghost"
                              size="icon"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => openDeleteMain(cat)}
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Tabela Subcategorias ───────────────────────────────────────────── */}
      {activeTab === "sub" && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Subcategorias</CardTitle>
            <Button size="sm" onClick={openNewSub} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Subcategoria
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subcategoria</TableHead>
                  <TableHead>Categoria Pai</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortCategories(subCategories).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <FolderTree className="h-8 w-8 opacity-30" />
                        <span>Nenhuma subcategoria cadastrada.</span>
                        {mainCategories.length > 0 ? (
                          <Button variant="outline" size="sm" onClick={openNewSub}>
                            Criar a primeira subcategoria
                          </Button>
                        ) : (
                          <p className="text-xs">Crie primeiro uma categoria principal.</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortCategories(subCategories).map((sub) => {
                    const parentCat = categories.find((c) => c.id === sub.parentId);
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-semibold">{sub.name}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                            {parentCat ? parentCat.name : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-xs">
                          {sub.slug || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => openEditSub(sub)}
                              variant="ghost"
                              size="icon"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => openDeleteSub(sub)}
                              variant="ghost"
                              size="icon"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ─── Modais ─────────────────────────────────────────────────────────── */}

      <CategoryFormModal
        open={formModal.open}
        onOpenChange={(open) => { if (!open) closeFormModal(); }}
        mode={formModal.open ? formModal.mode : "main"}
        category={formModal.open ? formModal.category : undefined}
        mainCategories={mainCategories}
        onSuccess={loadCategories}
      />

      <DeleteCategoryModal
        open={deleteModal.open}
        onOpenChange={(open) => { if (!open) closeDeleteModal(); }}
        category={deleteModal.open ? deleteModal.category : null}
        subcategoryCount={deleteSubcategoryCount}
        onSuccess={loadCategories}
      />
    </div>
  );
}