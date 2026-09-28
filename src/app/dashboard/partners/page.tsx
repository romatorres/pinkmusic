"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Importar Card components
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  imageUrl: string;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerImage, setNewPartnerImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setNewPartnerImage(file);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else if (editingPartner) {
      setPreviewUrl(getImageSrc(editingPartner.imageUrl));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleStartEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setNewPartnerName(partner.name);
    setNewPartnerImage(null);
    setPreviewUrl(getImageSrc(partner.imageUrl));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingPartner(null);
    setNewPartnerName("");
    setNewPartnerImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPartnerName.trim()) {
      toast.error("Por favor, informe o nome do parceiro.");
      return;
    }

    if (!editingPartner && !newPartnerImage) {
      toast.error("Por favor, selecione uma logo para o novo parceiro.");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("name", newPartnerName.trim());
    if (newPartnerImage) {
      formData.append("image", newPartnerImage);
    }

    try {
      const url = editingPartner ? `/api/partners/${editingPartner.id}` : "/api/partners";
      const method = editingPartner ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        await fetchPartners();
        toast.success(
          editingPartner
            ? "Parceiro atualizado com sucesso!"
            : "Parceiro adicionado com sucesso!"
        );
        handleCancelEdit();
      } else {
        const errorText = await response.text();
        console.error("Error saving partner:", errorText);
        toast.error(`Erro ao salvar parceiro: ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving partner:", error);
      toast.error("Erro ao salvar parceiro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o parceiro "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/partners/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        if (editingPartner?.id === id) {
          handleCancelEdit();
        }
        await fetchPartners();
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

  // Função para determinar se a URL é remota (Cloudinary), base64 ou caminho de arquivo
  const getImageSrc = (imageUrl: string) => {
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
      return imageUrl;
    }
    return `/partners/${imageUrl}`;
  };

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Gerenciar Parceiros / Marcas Parceiras
        </h1>
        <p className="text-sm text-muted-foreground">
          Controle as marcas parceiras exibidas no carrossel da página inicial.
        </p>
      </div>

      <Card className={editingPartner ? "border-primary shadow-md" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {editingPartner ? `Editar Parceiro: ${editingPartner.name}` : "Adicionar Novo Parceiro"}
            </CardTitle>
            {editingPartner && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancelar Edição
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partnerName">Nome do Parceiro</Label>
                <Input
                  id="partnerName"
                  type="text"
                  placeholder="Ex: Fender, Yamaha, Gibson..."
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="partnerImage">
                  Logo do Parceiro {editingPartner && <span className="text-xs text-muted-foreground">(Opcional para manter a atual)</span>}
                </Label>
                <Input
                  id="partnerImage"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  required={!editingPartner}
                />
              </div>
            </div>

            {/* Preview da Logo */}
            {previewUrl && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-4">
                <div className="relative h-16 w-24 bg-white rounded border flex items-center justify-center p-2 overflow-hidden shadow-sm">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">Pré-visualização da logo</p>
                  <p>
                    {newPartnerImage
                      ? `Novo arquivo selecionado (${(newPartnerImage.size / 1024).toFixed(1)} KB)`
                      : "Logo atual cadastrada"}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" className="md:w-auto w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingPartner ? "Atualizando no Cloudinary..." : "Enviando para o Cloudinary..."}
                  </>
                ) : (
                  editingPartner ? "Salvar Alterações" : "Adicionar Parceiro"
                )}
              </Button>
              {editingPartner && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parceiros Cadastrados ({partners.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum parceiro cadastrado ainda. Use o formulário acima para adicionar o primeiro.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {partners.map((partner) => {
                const isCurrentEditing = editingPartner?.id === partner.id;
                return (
                  <Card
                    key={partner.id}
                    className={`flex flex-col items-center justify-between p-4 transition-all ${
                      isCurrentEditing ? "ring-2 ring-primary border-primary bg-primary/5" : "hover:shadow-md"
                    }`}
                  >
                    <div className="relative mb-3 h-20 w-full bg-white rounded border flex items-center justify-center p-2">
                      <Image
                        src={getImageSrc(partner.imageUrl)}
                        alt={partner.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                    <p className="text-sm font-semibold text-center mb-3 line-clamp-1">
                      {partner.name}
                    </p>
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <Button
                        variant={isCurrentEditing ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => handleStartEdit(partner)}
                        className="w-full text-xs"
                      >
                        {isCurrentEditing ? "Editando" : "Editar"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePartner(partner.id, partner.name)}
                        className="w-full text-xs"
                      >
                        Excluir
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

