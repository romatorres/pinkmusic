"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!user) return;

    try {
      const res = await fetch(`/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setMessage("Perfil atualizado com sucesso!");
      } else {
        setMessage("Erro ao atualizar o perfil.");
      }
    } catch {
      setMessage("Erro ao atualizar o perfil.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmNewPassword) {
      setMessage("As novas senhas não coincidem.");
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
        setPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setMessage("Senha alterada com sucesso!");
      } else {
        setMessage("Erro ao alterar a senha.");
      }
    } catch {
      setMessage("Erro ao alterar a senha.");
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
                <label htmlFor="name">E-mail</label>
                <Input id="email" type="text" value={user?.email} readOnly />
              </div>
              <Button type="submit">Salvar Alterações</Button>
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
              <Button type="submit">Alterar Senha</Button>
            </form>
          </CardContent>
        </Card>

        {message && <p className="mt-4 text-center">{message}</p>}
      </div>
    </div>
  );
}
