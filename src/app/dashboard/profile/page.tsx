"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const profileSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome é obrigatório." })
    .min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
});

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, { message: "A senha deve ter pelo menos 6 caracteres" }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não coincidem",
    path: ["confirmNewPassword"],
  });

type ProfileFormInputs = z.infer<typeof profileSchema>;
type PasswordFormInputs = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  // Formulário de perfil
  const profileForm = useForm<ProfileFormInputs>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  // Formulário de senha
  const passwordForm = useForm<PasswordFormInputs>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação manual do nome
    if (!name || name.length < 3) {
      toast.error("O nome deve ter pelo menos 3 caracteres");
      return;
    }

    if (!user) return;

    try {
      const response = await fetch(`/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        toast.success("Perfil atualizado com sucesso!");
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Erro ao atualizar o perfil.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("Um erro inesperado ocorreu.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação manual das senhas
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!user) return;

    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setNewPassword("");
        setConfirmNewPassword("");
        toast.success("Senha alterada com sucesso!");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Erro ao alterar a senha.");
      }
    } catch (err) {
      console.error("Password change error:", err);
      toast.error("Um erro inesperado ocorreu.");
    }
  };

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Perfil do usuário</h1>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Editar Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="name">Nome</label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email">E-mail</label>
                <Input id="email" type="text" value={user?.email} readOnly />
              </div>
              <Button type="submit" className="md:w-auto w-full">
                Salvar Alterações
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="newPassword">Nova Senha</label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmNewPassword">Confirmar Nova Senha</label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="md:w-auto w-full">
                Alterar Senha
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
