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
});

type CategoriesFormInputs = z.infer<typeof categoriesSchema>;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<CategoriesFormInputs>({
    resolver: zodResolver(categoriesSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((response: { success: boolean; data: Category[] }) => {
        if (response.success) {
          setCategories(response.data);
        } else {
          toast.error("Erro ao carregar categorias.");
        }
      });
  }, []);

  const sortCategories = (categoryList: Category[]) => {
    return [...categoryList].sort((a, b) => a.name.localeCompare(b.name));
  };

  const onSubmit = async (data: CategoriesFormInputs) => {
    const method = editingCategory ? "PUT" : "POST";
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updatedCategory = await res.json();
      if (editingCategory) {
        setCategories(
          sortCategories(
            categories.map((c) =>
              c.id === updatedCategory.id ? updatedCategory : c
            )
          )
        );
      } else {
        setCategories(sortCategories([...categories, updatedCategory]));
      }
      form.reset();
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
    setEditingCategory(category);
  };

  const handleCancelEdit = () => {
    form.reset();
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

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Categorias</h1>
      <Card className="mb-8">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex md:flex-row flex-col gap-4 md:items-end items-start">
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Nova categoria" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="md:w-auto w-full">
                  {editingCategory ? "Atualizar" : "Adicionar Categoria"}
                </Button>
                {editingCategory && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="md:w-auto w-full"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleEdit(category)}
                        variant="ghost"
                        size="icon"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(category.id)}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}