"use client";

import { useState, useEffect } from "react";
import { Category } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, FolderTree, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const mainCategorySchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da categoria principal é obrigatório." })
    .min(3, { message: "A categoria deve ter pelo menos 3 caracteres" }),
});

const subCategorySchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da subcategoria é obrigatório." })
    .min(3, { message: "A subcategoria deve ter pelo menos 3 caracteres" }),
  parentId: z
    .string()
    .min(1, { message: "Selecione uma categoria pai para a subcategoria." }),
});

type MainCategoryFormInputs = z.infer<typeof mainCategorySchema>;
type SubCategoryFormInputs = z.infer<typeof subCategorySchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"main" | "sub">("main");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const mainForm = useForm<MainCategoryFormInputs>({
    resolver: zodResolver(mainCategorySchema),
    defaultValues: { name: "" },
  });

  const subForm = useForm<SubCategoryFormInputs>({
    resolver: zodResolver(subCategorySchema),
    defaultValues: { name: "", parentId: "" },
  });

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

  const sortCategories = (categoryList: Category[]) => {
    return [...categoryList].sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleMainSubmit = async (data: MainCategoryFormInputs) => {
    const isEdit = editingCategory && !editingCategory.parentId;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/categories/${editingCategory.id}` : "/api/categories";

    const payload = {
      name: data.name,
      parentId: null,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      loadCategories();
      mainForm.reset({ name: "" });
      setEditingCategory(null);
      toast.success(`Categoria Principal ${isEdit ? "atualizada" : "criada"} com sucesso!`);
    } else {
      toast.error("Ocorreu um erro ao salvar a categoria principal.");
    }
  };

  const handleSubSubmit = async (data: SubCategoryFormInputs) => {
    const isEdit = editingCategory && !!editingCategory.parentId;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/categories/${editingCategory.id}` : "/api/categories";

    const payload = {
      name: data.name,
      parentId: data.parentId,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      loadCategories();
      subForm.reset({ name: "", parentId: "" });
      setEditingCategory(null);
      toast.success(`Subcategoria ${isEdit ? "atualizada" : "criada"} com sucesso!`);
    } else {
      toast.error("Ocorreu um erro ao salvar a subcategoria.");
    }
  };

  const handleEditMain = (category: Category) => {
    setActiveTab("main");
    setEditingCategory(category);
    mainForm.setValue("name", category.name);
  };

  const handleEditSub = (category: Category) => {
    setActiveTab("sub");
    setEditingCategory(category);
    subForm.setValue("name", category.name);
    subForm.setValue("parentId", category.parentId || "");
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    mainForm.reset({ name: "" });
    subForm.reset({ name: "", parentId: "" });
  };

  const handleDelete = async (id: string, isSub: boolean) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id));
      toast.success(`${isSub ? "Subcategoria" : "Categoria principal"} deletada com sucesso!`);
      if (editingCategory?.id === id) {
        handleCancelEdit();
      }
    } else {
      toast.error("Ocorreu um erro ao deletar.");
    }
  };

  return (
    <div className="md:pt-8 pt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="md:text-3xl text-2xl font-bold">Categorias & Subcategorias</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seu catálogo separando categorias principais e subcategorias individualmente.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-lg self-start md:self-auto">
          <Button
            type="button"
            variant={activeTab === "main" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("main");
              if (editingCategory?.parentId) handleCancelEdit();
            }}
            className="flex items-center gap-2"
          >
            <Tag className="h-4 w-4" />
            Categorias Principais ({mainCategories.length})
          </Button>
          <Button
            type="button"
            variant={activeTab === "sub" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setActiveTab("sub");
              if (editingCategory && !editingCategory.parentId) handleCancelEdit();
            }}
            className="flex items-center gap-2"
          >
            <FolderTree className="h-4 w-4" />
            Subcategorias ({subCategories.length})
          </Button>
        </div>
      </div>

      {activeTab === "main" ? (
        <>
          {/* Form Categorias Principais */}
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {editingCategory && !editingCategory.parentId
                  ? "Editar Categoria Principal"
                  : "Adicionar Categoria Principal"}
              </CardTitle>
              <CardDescription>
                Categorias principais funcionam como os grupos raiz da loja (ex: Guitarras, Teclados, Áudio).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...mainForm}>
                <form onSubmit={mainForm.handleSubmit(handleMainSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={mainForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Categoria Principal</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Guitarras, Teclados, Percussão..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    {editingCategory && !editingCategory.parentId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit">
                      {editingCategory && !editingCategory.parentId
                        ? "Atualizar Categoria Principal"
                        : "Adicionar Categoria Principal"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Tabela Categorias Principais */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Lista de Categorias Principais</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Subcategorias Vinculadas</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortCategories(mainCategories).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhuma categoria principal cadastrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortCategories(mainCategories).map((cat) => {
                      const childCount = categories.filter((c) => c.parentId === cat.id).length;
                      return (
                        <TableRow key={cat.id}>
                          <TableCell className="font-semibold">{cat.name}</TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">
                            {cat.slug || "-"}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {childCount} {childCount === 1 ? "subcategoria" : "subcategorias"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => handleEditMain(cat)}
                                variant="ghost"
                                size="icon"
                                title="Editar Categoria Principal"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(cat.id, false)}
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
        </>
      ) : (
        <>
          {/* Form Subcategorias */}
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {editingCategory && !!editingCategory.parentId
                  ? "Editar Subcategoria"
                  : "Adicionar Subcategoria"}
              </CardTitle>
              <CardDescription>
                Subcategorias pertencem diretamente a uma Categoria Principal (ex: Guitarras Elétricas pertence a Guitarras).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...subForm}>
                <form onSubmit={subForm.handleSubmit(handleSubSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={subForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Subcategoria</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Guitarras Elétricas, Pedais de Efeito..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={subForm.control}
                      name="parentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria Pai</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione a Categoria Principal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {mainCategories.length === 0 ? (
                                <SelectItem value="disabled" disabled>
                                  Cadastre primeiro uma Categoria Principal
                                </SelectItem>
                              ) : (
                                mainCategories.map((parent) => (
                                  <SelectItem key={parent.id} value={parent.id}>
                                    {parent.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    {editingCategory && !!editingCategory.parentId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button type="submit">
                      {editingCategory && !!editingCategory.parentId
                        ? "Atualizar Subcategoria"
                        : "Adicionar Subcategoria"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Tabela Subcategorias */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Lista de Subcategorias</CardTitle>
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
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        Nenhuma subcategoria cadastrada.
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
                            {sub.slug || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                onClick={() => handleEditSub(sub)}
                                variant="ghost"
                                size="icon"
                                title="Editar Subcategoria"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDelete(sub.id, true)}
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
        </>
      )}
    </div>
  );
}