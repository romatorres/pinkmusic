"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";

export default function ProfilePage() {
  const { user } = useAuthStore();

  return (
    <div className="md:pt-8 pt-12">
      <h1 className="md:text-3xl text-2xl font-bold mb-6">Perfil do usuário</h1>
      <Card>
        <CardContent className="pt-6">
          {user ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Nome</h3>
                <p className="text-muted-foreground">{user.name}</p>
              </div>
              <div>
                <h3 className="font-semibold">E-mail</h3>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>
          ) : (
            <p>Carregando informações do usuário...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
