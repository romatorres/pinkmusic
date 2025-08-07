"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Importar Card components
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  imageUrl: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerImage, setNewPartnerImage] = useState<File | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch("/api/partners");
      const data = await response.json();
      setPartners(data);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Erro ao carregar parceiros.");
    }
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName || !newPartnerImage) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newPartnerName);
    formData.append("image", newPartnerImage);

    try {
      const response = await fetch("/api/partners", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        fetchPartners();
        setNewPartnerName("");
        setNewPartnerImage(null);
        toast.success("Parceiro adicionado com sucesso!");
      } else {
        const errorText = await response.text();
        console.error("Error adding partner:", errorText);
        toast.error(`Erro ao adicionar parceiro: ${errorText}`);
      }
    } catch (error) {
      console.error("Error adding partner:", error);
      toast.error("Erro ao adicionar parceiro.");
    }
  };

  const handleDeletePartner = async (id: string) => {
    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchPartners();
        toast.success("Parceiro excluído com sucesso!");
      } else {
        const errorText = await response.text();
        console.error("Error deleting partner:", errorText);
        toast.error(`Erro ao excluir parceiro: ${errorText}`);
      }
    } catch (error) {
      console.error("Error deleting partner:", error);
      toast.error("Erro ao excluir parceiro.");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Gerenciar Parceiros</h1>

      <Card className="mb-8 ">
        <CardHeader>
          <CardTitle>Adicionar Novo Parceiro</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddPartner} className="space-y-4">
            <div>
              <Label htmlFor="partnerName" className="mb-2">
                Nome do Parceiro
              </Label>
              <Input
                id="partnerName"
                type="text"
                value={newPartnerName}
                onChange={(e) => setNewPartnerName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="partnerImage" className="mb-2">
                Logo do Parceiro
              </Label>
              <Input
                id="partnerImage"
                type="file"
                onChange={(e) =>
                  setNewPartnerImage(e.target.files ? e.target.files[0] : null)
                }
                required
              />
            </div>
            <Button type="submit">Adicionar Parceiro</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parceiros Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {partners.map((partner) => (
              <Card key={partner.id} className="flex flex-col items-center p-4">
                <img
                  src={`/partners/${partner.imageUrl}`}
                  alt={partner.name}
                  className="w-24 h-24 object-contain mb-4"
                />
                <p className="text-lg font-semibold text-center mb-2">
                  {partner.name}
                </p>
                <Button
                  variant="destructive"
                  onClick={() => handleDeletePartner(partner.id)}
                  className="w-full"
                >
                  Excluir
                </Button>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
