"use client";

import { useState, useEffect } from "react";
import { Brand } from "@/lib/types";
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
import Image from "next/image";

const brandsSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da marca é obrigatório." })
    .min(2, { message: "A marca deve ter pelo menos 2 caracteres" }),
  logo: z
    .string()
    .url({ message: "URL inválida" })
    .optional()
    .or(z.literal("")),
});

type BrandsFormInputs = z.infer<typeof brandsSchema>;

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const form = useForm<BrandsFormInputs>({
    resolver: zodResolver(brandsSchema),
    defaultValues: {
      name: "",
      logo: "",
    },
  });

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data.data || []));
  }, []);

  const onSubmit = async (data: BrandsFormInputs) => {
    const method = editingBrand ? "PUT" : "POST";
    const url = editingBrand ? `/api/brands/${editingBrand.id}` : "/api/brands";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const newBrand = await res.json();
      if (editingBrand) {
        setBrands(
          brands.map((b) => (b.id === newBrand.data.id ? newBrand.data : b))
        );
      } else {
        setBrands([...brands, newBrand.data]);
      }
      form.reset();
      setEditingBrand(null);
      toast.success(
        `Marca ${editingBrand ? "atualizada" : "criada"} com sucesso!`
      );
    } else {
      toast.error("Ocorreu um erro. Tente novamente.");
    }
  };

  const handleEdit = (brand: Brand) => {
    form.setValue("name", brand.name);
    form.setValue("logo", brand.logo || "");
    setEditingBrand(brand);
  };

  const handleCancelEdit = () => {
    form.reset();
    setEditingBrand(null);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/brands/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setBrands(brands.filter((b) => b.id !== id));
      toast.success("Marca deletada com sucesso!");
    } else {
      toast.error("Ocorreu um erro ao deletar a marca.");
    }
  };

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Marcas</h1>
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
                        <FormLabel>Nome da Marca</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Nike, Apple, Samsung..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-full">
                  <FormField
                    control={form.control}
                    name="logo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo (URL) - Opcional</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://exemplo.com/logo.png"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="md:w-auto w-full">
                  {editingBrand ? "Atualizar" : "Adicionar Marca"}
                </Button>
                {editingBrand && (
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
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    {brand.logo ? (
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{brand.name}</TableCell>
                  <TableCell>
                    {brand._count?.products || 0} produto(s)
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        onClick={() => handleEdit(brand)}
                        variant="ghost"
                        size="icon"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(brand.id)}
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
