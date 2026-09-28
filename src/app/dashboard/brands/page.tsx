"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Brand } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Trash2,
  Upload,
  Link as LinkIcon,
  Search,
  X,
  Loader2,
  Building2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [logoInputType, setLogoInputType] = useState<"file" | "url">("file");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/brands");
      const data = await res.json();
      if (data.success) {
        setBrands(data.data || []);
      } else {
        toast.error("Erro ao carregar marcas.");
      }
    } catch (error) {
      console.error("Erro ao buscar marcas:", error);
      toast.error("Erro ao carregar marcas.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setLogoUrl("");
    } else if (editingBrand?.logo) {
      setPreviewUrl(editingBrand.logo);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleUrlChange = (value: string) => {
    setLogoUrl(value);
    setLogoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setPreviewUrl(value.trim() ? value.trim() : null);
  };

  const handleStartEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setLogoFile(null);
    setLogoUrl(brand.logo || "");
    setPreviewUrl(brand.logo || null);
    setLogoInputType(brand.logo?.startsWith("http") ? "url" : "file");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingBrand(null);
    setName("");
    setLogoFile(null);
    setLogoUrl("");
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClearLogo = () => {
    setLogoFile(null);
    setLogoUrl("");
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 2) {
      toast.error("O nome da marca deve ter pelo menos 2 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalLogoUrl = logoUrl.trim();

      // Se o usuário selecionou um arquivo local, faz o upload para o Cloudinary na pasta 'pinkmusic/brands'
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("folder", "pinkmusic/brands");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Falha ao enviar logo para o Cloudinary.");
        }

        finalLogoUrl = uploadData.url;
      }

      // Se estiver editando e não escolheu novo arquivo nem digitou nova URL, mantém a existente
      if (editingBrand && !logoFile && !logoUrl && previewUrl === editingBrand.logo) {
        finalLogoUrl = editingBrand.logo || "";
      }

      const method = editingBrand ? "PUT" : "POST";
      const url = editingBrand ? `/api/brands/${editingBrand.id}` : "/api/brands";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          logo: finalLogoUrl || null,
        }),
      });

      const responseData = await res.json();

      if (res.ok && responseData.success) {
        if (editingBrand) {
          setBrands(
            brands.map((b) => (b.id === responseData.data.id ? responseData.data : b))
          );
        } else {
          setBrands([responseData.data, ...brands]);
        }
        handleCancelEdit();
        toast.success(
          `Marca ${editingBrand ? "atualizada" : "criada"} com sucesso!`
        );
      } else {
        toast.error(responseData.error || "Ocorreu um erro ao salvar a marca.");
      }
    } catch (error) {
      console.error("Erro ao salvar marca:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro inesperado ao salvar marca."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (brand: Brand) => {
    const productCount = brand._count?.products || 0;
    const warning =
      productCount > 0
        ? `\n\nATENÇÃO: Existem ${productCount} produto(s) vinculados a esta marca!`
        : "";

    if (!confirm(`Tem certeza que deseja excluir a marca "${brand.name}"?${warning}`)) {
      return;
    }

    setIsDeleting(brand.id);
    try {
      const res = await fetch(`/api/brands/${brand.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        if (editingBrand?.id === brand.id) {
          handleCancelEdit();
        }
        setBrands(brands.filter((b) => b.id !== brand.id));
        toast.success("Marca excluída com sucesso!");
      } else {
        const errorText = await res.text();
        toast.error(`Erro ao deletar marca: ${errorText || "Tente novamente."}`);
      }
    } catch (error) {
      console.error("Erro ao deletar marca:", error);
      toast.error("Ocorreu um erro ao deletar a marca.");
    } finally {
      setIsDeleting(null);
    }
  };

  const filteredBrands = useMemo(() => {
    if (!search.trim()) return brands;
    const term = search.toLowerCase().trim();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.slug && b.slug.toLowerCase().includes(term))
    );
  }, [brands, search]);

  return (
    <div className="space-y-6 pt-2 md:pt-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Gerenciar Marcas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre, edite e vincule marcas aos produtos da loja.
          </p>
        </div>
      </div>

      {/* Card do Formulário (Inserção e Edição) */}
      <Card className={editingBrand ? "border-primary shadow-md" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>
                {editingBrand ? `Editar Marca: ${editingBrand.name}` : "Adicionar Nova Marca"}
              </CardTitle>
            </div>
            {editingBrand && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancelar Edição
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome da Marca */}
              <div className="space-y-2">
                <Label htmlFor="brandName">
                  Nome da Marca <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brandName"
                  placeholder="Ex: Fender, Gibson, Yamaha, Shure..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  O identificador (slug) será gerado automaticamente.
                </p>
              </div>

              {/* Logo da Marca */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Logo da Marca (Opcional)</Label>
                  <div className="flex items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setLogoInputType("file")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        logoInputType === "file"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Upload className="inline-block h-3 w-3 mr-1" />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputType("url")}
                      className={`px-2 py-0.5 rounded transition-colors ${
                        logoInputType === "url"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <LinkIcon className="inline-block h-3 w-3 mr-1" />
                      URL
                    </button>
                  </div>
                </div>

                {logoInputType === "file" ? (
                  <Input
                    id="brandLogoFile"
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                ) : (
                  <Input
                    id="brandLogoUrl"
                    type="url"
                    placeholder="https://exemplo.com/logo.png"
                    value={logoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    disabled={isSubmitting}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  {logoInputType === "file"
                    ? "O arquivo será salvo com otimização no Cloudinary."
                    : "Cole uma URL direta de imagem da internet."}
                </p>
              </div>
            </div>

            {/* Preview da Logo */}
            {previewUrl && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-24 bg-white rounded border flex items-center justify-center p-2 overflow-hidden shadow-sm">
                    <Image
                      src={previewUrl}
                      alt="Preview da Marca"
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">Pré-visualização da logo</p>
                    <p>
                      {logoFile
                        ? `Arquivo: ${logoFile.name} (${(logoFile.size / 1024).toFixed(1)} KB)`
                        : logoUrl
                        ? "Imagem por link URL"
                        : "Logo atual da marca"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearLogo}
                  title="Remover logo"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remover
                </Button>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex items-center gap-3">
              <Button type="submit" className="md:w-auto w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {logoFile ? "Enviando para o Cloudinary..." : "Salvando..."}
                  </>
                ) : editingBrand ? (
                  "Salvar Alterações"
                ) : (
                  "Adicionar Marca"
                )}
              </Button>
              {editingBrand && (
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

      {/* Listagem de Marcas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>
              Marcas Cadastradas ({filteredBrands.length} de {brands.length})
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar marca..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Carregando marcas...</span>
            </div>
          ) : filteredBrands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search.trim() ? (
                <>
                  <p className="font-medium text-foreground">Nenhuma marca encontrada</p>
                  <p className="text-sm mt-1">Nenhum resultado para a busca &quot;{search}&quot;.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-foreground">Nenhuma marca cadastrada</p>
                  <p className="text-sm mt-1">Use o formulário acima para adicionar a primeira marca.</p>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Logo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Identificador (Slug)</TableHead>
                    <TableHead>Produtos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBrands.map((brand) => {
                    const isCurrentEditing = editingBrand?.id === brand.id;
                    const productCount = brand._count?.products || 0;

                    return (
                      <TableRow
                        key={brand.id}
                        className={isCurrentEditing ? "bg-primary/5" : ""}
                      >
                        <TableCell>
                          {brand.logo ? (
                            <div className="relative h-10 w-16 bg-white rounded border flex items-center justify-center p-1">
                              <Image
                                src={brand.logo}
                                alt={brand.name}
                                fill
                                unoptimized
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-16 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                              <ImageIcon className="h-4 w-4 opacity-40" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {brand.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">
                          {brand.slug}
                        </TableCell>
                        <TableCell>
                          <Badge variant={productCount > 0 ? "secondary" : "outline"}>
                            {productCount} {productCount === 1 ? "produto" : "produtos"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => handleStartEdit(brand)}
                              variant={isCurrentEditing ? "secondary" : "ghost"}
                              size="icon"
                              title="Editar marca"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(brand)}
                              variant="ghost"
                              size="icon"
                              disabled={isDeleting === brand.id}
                              title="Excluir marca"
                              className="text-destructive hover:text-destructive"
                            >
                              {isDeleting === brand.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
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
