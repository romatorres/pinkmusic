"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Edit, Trash2, ShieldCheck, Briefcase, UserPlus, Search, AlertCircle } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuthStore } from "@/store/authStore";

const systemUserSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome é obrigatório." })
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres." }),
  email: z
    .string()
    .min(1, { message: "O email é obrigatório." })
    .email({ message: "Email inválido." }),
  password: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length >= 6,
      { message: "A senha deve ter pelo menos 6 caracteres." }
    ),
  role: z.enum(["ADMIN", "EMPLOYEE"], {
    message: "Selecione a função do usuário.",
  }),
});

type SystemUserFormInputs = z.infer<typeof systemUserSchema>;

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE" | "FUNCIONARIO";
  createdAt?: string;
}

export default function SystemUsersPage() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<SystemUserFormInputs>({
    resolver: zodResolver(systemUserSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "EMPLOYEE",
    },
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/users?type=system");
      if (!response.ok) {
        throw new Error("Falha ao buscar usuários do sistema.");
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Erro ao carregar equipe:", error);
      toast.error("Erro ao carregar os usuários do sistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onSubmit = async (data: SystemUserFormInputs) => {
    const isEditing = !!editingUser;
    const url = isEditing
      ? `/api/auth/users/${editingUser.id}`
      : "/api/auth/users";
    const method = isEditing ? "PUT" : "POST";

    // Se estiver criando e não informou senha
    if (!isEditing && (!data.password || data.password.trim() === "")) {
      toast.error("A senha é obrigatória para criar um novo usuário.");
      return;
    }

    try {
      const payload: { name: string; email: string; role: string; password?: string } = {
        name: data.name,
        email: data.email,
        role: data.role,
      };

      if (data.password && data.password.trim() !== "") {
        payload.password = data.password;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast.success(
          `Usuário ${isEditing ? "atualizado" : "adicionado"} com sucesso!`
        );
        form.reset({ name: "", email: "", password: "", role: "EMPLOYEE" });
        setEditingUser(null);
        setShowForm(false);
        fetchUsers();
      } else {
        toast.error(
          responseData.message ||
            `Erro ao ${isEditing ? "atualizar" : "cadastrar"} usuário.`
        );
      }
    } catch (err) {
      console.error("Erro no envio do formulário:", err);
      toast.error("Um erro inesperado ocorreu.");
    }
  };

  const handleEdit = (user: SystemUser) => {
    setEditingUser(user);
    setShowForm(true);
    const normalizedRole = user.role === "FUNCIONARIO" ? "EMPLOYEE" : user.role;
    form.reset({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: normalizedRole as "ADMIN" | "EMPLOYEE",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    form.reset({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setEditingUser(null);
    setShowForm(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) {
      toast.error("Você não pode excluir sua própria conta de administrador.");
      return;
    }

    if (!confirm(`Tem certeza que deseja remover ${name} do sistema?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/users/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Usuário removido com sucesso!");
        fetchUsers();
      } else {
        const errorData = await res.json().catch(() => null);
        toast.error(errorData?.message || "Erro ao excluir o usuário.");
      }
    } catch {
      toast.error("Erro de comunicação com o servidor.");
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const counts = useMemo(() => {
    const admins = users.filter((u) => u.role === "ADMIN").length;
    const funcionarios = users.filter((u) => u.role === "EMPLOYEE" || u.role === "FUNCIONARIO").length;
    return { total: users.length, admins, funcionarios };
  }, [users]);

  return (
    <div className="md:pt-4 pt-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Usuários do Sistema (Equipe)
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie os administradores e funcionários com acesso ao painel de controle da Pink Music.
          </p>
        </div>

        {!showForm && (
          <Button
            onClick={() => {
              setEditingUser(null);
              form.reset({ name: "", email: "", password: "", role: "EMPLOYEE" });
              setShowForm(true);
            }}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            Novo Membro da Equipe
          </Button>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total na Equipe
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{counts.total}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Administradores
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {counts.admins}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Funcionários
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {counts.funcionarios}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Adicionar / Editar */}
      {showForm && (
        <Card className="border-primary/40 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {editingUser ? (
                <>
                  <Edit className="h-5 w-5 text-primary" />
                  Editar Usuário: {editingUser.name}
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5 text-primary" />
                  Adicionar Novo Membro da Equipe
                </>
              )}
            </CardTitle>
            <CardDescription>
              {editingUser
                ? "Atualize as credenciais ou altere o nível de acesso do usuário."
                : "Defina o nível de acesso e as credenciais para o novo membro do sistema."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Roberto Silva" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email de Acesso</FormLabel>
                        <FormControl>
                          <Input placeholder="usuario@pinkmusic.com.br" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Função / Nível de Acesso</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a função" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EMPLOYEE">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-emerald-500" />
                                <div>
                                  <span className="font-medium">Funcionário (Employee)</span>
                                  <span className="text-xs text-muted-foreground block">
                                    Acesso a Pedidos, Vendas e Clientes
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-purple-500" />
                                <div>
                                  <span className="font-medium">Administrador</span>
                                  <span className="text-xs text-muted-foreground block">
                                    Acesso Total (Catálogo, Equipe, Configurações)
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {editingUser ? "Nova Senha (opcional)" : "Senha de Acesso"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              editingUser
                                ? "Deixe em branco para manter a senha atual"
                                : "Mínimo de 6 caracteres"
                            }
                            type="password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button type="submit">
                    {editingUser ? "Salvar Alterações" : "Cadastrar Usuário"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Membros Cadastrados</CardTitle>
            <CardDescription>
              Lista de todos os administradores e funcionários com acesso ao painel.
            </CardDescription>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState label="Carregando usuários da equipe..." className="min-h-[200px]" />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-medium">Nenhum membro encontrado.</p>
              {searchTerm && <p className="text-xs mt-1">Tente ajustar a busca.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isAdmin = u.role === "ADMIN";

                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-semibold text-xs text-muted-foreground">
                              {u.name?.slice(0, 2).toUpperCase() || "US"}
                            </div>
                            <div>
                              <span>{u.name}</span>
                              {isSelf && (
                                <span className="ml-2 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                  Você
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          {isAdmin ? (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 gap-1.5 font-semibold">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Administrador
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 gap-1.5 font-semibold">
                              <Briefcase className="h-3.5 w-3.5" />
                              Funcionário
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {isAdmin
                            ? "Acesso Total (Catálogo, Equipe, Vendas)"
                            : "Pedidos, Vendas e Clientes"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => handleEdit(u)}
                              variant="ghost"
                              size="sm"
                              title="Editar usuário"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              onClick={() => handleDelete(u.id, u.name)}
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              className={isSelf ? "opacity-30 cursor-not-allowed" : "text-destructive hover:bg-destructive/10"}
                              title={isSelf ? "Você não pode excluir sua própria conta" : "Remover usuário"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
