"use client";

import { useState, useEffect } from "react";
import { Category } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";

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
    <div>
      <h1>Categories</h1>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nova Categoria"
              />
              <Button type="submit">
                {editingCategory ? "Update" : "Create"}
              </Button>
            </div>
            <Table>
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
            </Table>
          </form>
          <ul>
            {categories.map((category) => (
              <li key={category.id}>
                {category.name}
                <button onClick={() => handleEdit(category)}>Edit</button>
                <button onClick={() => handleDelete(category.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
