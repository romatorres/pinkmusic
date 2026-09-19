"use client";

import { useState, useEffect } from "react";
import { Category } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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
import { Edit, Trash2 } from "lucide-react";
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

const categoriesSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da categoria é obrigatório." })
    .min(3, { message: "A categoria deve ter pelo menos 3 caracteres" }),
  parentId: z.string().optional(),
});

type CategoriesFormInputs = z.infer<typeof categoriesSchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<CategoriesFormInputs>({
    resolver: zodResolver(categoriesSchema),
    defaultValues: {
      name: "",
      parentId: "none",
    },
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

  const sortCategories = (categoryList: Category[]) => {
    return [...categoryList].sort((a, b) => a.name.localeCompare(b.name));
  };

  const onSubmit = async (data: CategoriesFormInputs) => {
    const method = editingCategory ? "PUT" : "POST";
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";

    const payload = {
      name: data.name,
      parentId: data.parentId === "none" ? null : data.parentId,
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      loadCategories();
      form.reset({ name: "", parentId: "none" });
      setEditingCategory(null);
      toast.success(
        `Categoria ${
          editingCategory ? "atualizada" : "criada"
        } com sucesso!`
      );
    } else {
      toast.error("Ocorreu um erro. Tente novamente.");
    }
  };

  const handleEdit = (category: Category) => {
    form.setValue("name", category.name);
    form.setValue("parentId", category.parentId || "none");
    setEditingCategory(category);
  };

  const handleCancelEdit = () => {
    form.reset({ name: "", parentId: "none" });
    setEditingCategory(null);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setCategories(sortCategories(categories.filter((c) => c.id !== id)));
      toast.success("Categoria deletada com sucesso!");
    } else {
      toast.error("Ocorreu um erro ao deletar a categoria.");
    }
  };

  // Filtrar apenas categorias principais que podem ser pais (excluindo a categoria sendo editada para evitar ciclo)
  const availableParents = categories.filter(
    (c) => !c.parentId && (!editingCategory || c.id !== editingCategory.id)
  );

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Categorias</h1>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Guitarras, Cordas, Teclados..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria Pai (Hierarquia)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "none"}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione a categoria pai" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              Nenhuma (Categoria Principal)
                            </SelectItem>
                            {availableParents.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                {editingCategory && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                )}
                <Button type="submit">
                  {editingCategory ? "Atualizar Categoria" : "Adicionar Categoria"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria Pai</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortCategories(categories).map((category) => {
                const parentCat = categories.find((c) => c.id === category.parentId);
                const isRoot = !category.parentId;

                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      {category.name}
                    </TableCell>
                    <TableCell>
                      {isRoot ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          Principal
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-normal bg-secondary/30 text-foreground">
                          Subcategoria
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {parentCat ? parentCat.name : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleEdit(category)}
                          variant="ghost"
                          size="icon"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
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
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}