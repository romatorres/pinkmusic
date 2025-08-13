"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";

const registerSchema = z.object({
  email: z
    .string()
    .min(1, { message: "O email é obrigatório." })
    .email({ message: "Email inválido" }),
  name: z
    .string()
    .min(1, { message: "O nome é obrigatório." })
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  password: z
    .string()
    .min(1, { message: "A senha é obrigatória." })
    .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
});

type RegisterFormInputs = z.infer<typeof registerSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const form = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/users");
      if (!response.ok) {
        throw new Error("Falha ao buscar usuários");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast.error("Erro ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: RegisterFormInputs) => {
    const isEditing = !!editingUser;
    // NOTA: Ao editar, o campo de senha deveria ser opcional.
    // A implementação atual exige uma senha em cada atualização.
    // Considere ajustar o schema do Zod para atualizações.
    const url = isEditing
      ? `/api/user/${editingUser?.id}`
      : "/api/auth/register";
    const method = isEditing ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success(
          `Usuário ${isEditing ? "atualizado" : "registrado"} com sucesso!`
        );
        form.reset();
        setEditingUser(null);
        fetchUsers(); // Atualiza a lista de usuários
      } else {
        toast.error(
          responseData.message ||
            `Erro ao ${isEditing ? "atualizar" : "registrar"} usuário.`
        );
      }
    } catch (err) {
      console.error("Form submission error:", err);
      toast.error("Um erro inesperado ocorreu.");
    }
  };

  const handleEdit = (user: User) => {
    form.setValue("name", user.name);
    form.setValue("email", user.email);
    // Não é recomendado pré-preencher a senha.
    // O admin deve apenas definir uma nova senha, não ver a antiga.
    form.setValue("password", "");
    setEditingUser(user);
  };

  const handleCancelEdit = () => {
    form.reset();
    setEditingUser(null);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/user/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Usuário deletado com sucesso!");
      fetchUsers(); // Atualiza a lista de usuários
    } else {
      toast.error("Ocorreu um erro ao deletar o usuário.");
    }
  };

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Cadastrar Usuário</h1>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Adicione um novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do usuário" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Deixe em branco para não alterar"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" className="w-full md:w-auto">
                  {editingUser ? "Atualizar Usuário" : "Adicionar Usuário"}
                </Button>
                {editingUser && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="w-full md:w-auto"
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
        <CardHeader>
          <CardTitle>Todos os Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {users.length === 0 ? (
                <p className="text-center text-gray-500">
                  Nenhum usuário cadastrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              onClick={() => handleEdit(user)}
                              variant="ghost"
                              size="icon"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(user.id)}
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}