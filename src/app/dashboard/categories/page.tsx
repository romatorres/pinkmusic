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
import { Label } from "@/components/ui/label";
import { Edit, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingCategory ? "PUT" : "POST";
    const url = editingCategory
      ? `/api/categories/${editingCategory.id}`
      : "/api/categories";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const updatedCategory = await res.json();
      if (editingCategory) {
        setCategories(
          categories.map((c) =>
            c.id === updatedCategory.id ? updatedCategory : c
          )
        );
      } else {
        setCategories([...categories, updatedCategory]);
      }
      setName("");
      setEditingCategory(null);
    }
  };

  const handleEdit = (category: Category) => {
    setName(category.name);
    setEditingCategory(category);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Categories</h1>
      <Card className="mb-8">
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex md:flex-row flex-col gap-4 md:items-end items-start">
              <div className="w-full">
                <Label className="mb-3">Nova categoria</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nova Categoria"
                />
              </div>
              <Button type="submit" className="md:w-auto w-full">
                {editingCategory ? "Atualizar" : "Adicionar Categoria"}
              </Button>
            </div>
            {editingCategory && (
              <button
                onClick={() => {
                  setName("");
                  setEditingCategory(null);
                }}
              >
                Cancel
              </button>
            )}
          </form>
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
