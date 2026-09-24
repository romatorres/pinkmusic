"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Store, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { Category, Brand } from "@/lib/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface LocalProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  brands: Brand[];
  onSuccess: () => void;
}

export function LocalProductModal({
  open,
  onOpenChange,
  categories,
  brands,
  onSuccess,
}: LocalProductModalProps) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [packageSize, setPackageSize] = useState<string>("SMALL");
  const [price, setPrice] = useState("");
  const [availableQuantity, setAvailableQuantity] = useState("1");
  const [formMainCategory, setFormMainCategory] = useState("");
  const [formSubCategory, setFormSubCategory] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLocalPickup, setIsLocalPickup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mainCategories = categories.filter((c) => !c.parentId);

  const availableSubcategories =
    formMainCategory && formMainCategory !== "none"
      ? categories.filter((c) => c.parentId === formMainCategory)
      : [];

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const handleMainCategoryChange = (val: string) => {
    setFormMainCategory(val);
    setFormSubCategory("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem válido.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setTitle("");
    setCode("");
    setPackageSize("SMALL");
    setPrice("");
    setAvailableQuantity("1");
    setFormMainCategory("");
    setFormSubCategory("");
    setFormBrand("");
    setDescription("");
    setImageUrl("");
    setImagePreview(null);
    setSelectedFile(null);
    setUploadStatus("");
    setIsLocalPickup(true);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Informe o título do produto.");
      return;
    }

    const parsedPrice = parseFloat(price.replace(",", "."));
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Informe um preço válido maior que zero.");
      return;
    }

    const parsedQty = parseInt(availableQuantity, 10);
    if (isNaN(parsedQty) || parsedQty < 0) {
      toast.error("Informe uma quantidade válida em estoque.");
      return;
    }

    setIsSubmitting(true);

    let finalImageUrl = imageUrl.trim();

    try {
      // 1. Se foi selecionado um arquivo de imagem local, envia para o Cloudinary primeiro
      if (selectedFile) {
        setUploadStatus("Enviando foto para o Cloudinary...");
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || "Falha no upload da imagem para o Cloudinary.");
        }

        finalImageUrl = uploadData.url;
      }

      setUploadStatus("Salvando produto...");

      const finalCategoryId =
        formSubCategory && formSubCategory !== "none"
          ? formSubCategory
          : formMainCategory && formMainCategory !== "none"
          ? formMainCategory
          : null;

      // 2. Salva o produto no banco com a URL gerada pelo Cloudinary
      const response = await fetch("/api/products/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim() || null,
          title: title.trim(),
          price: parsedPrice,
          available_quantity: parsedQty,
          brandId: formBrand && formBrand !== "none" ? formBrand : null,
          categoryId: finalCategoryId,
          description: description.trim() || null,
          thumbnail: finalImageUrl || "/images/placeholder-product.png",
          pictures: finalImageUrl ? [{ url: finalImageUrl }] : [],
          isLocalPickup,
          packageSize,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Produto local cadastrado com sucesso!");
        onSuccess();
        handleClose();
      } else {
        toast.error(result.error || "Erro ao cadastrar produto local.");
      }
    } catch (error) {
      console.error("Erro ao salvar produto local:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro de conexão ao salvar produto."
      );
    } finally {
      setIsSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[92vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="h-5 w-5 text-emerald-600" />
            Cadastrar Produto - Estoque Local / Balcão
          </DialogTitle>
          <DialogDescription>
            Cadastre itens de reposição ou acessórios físicos que serão vendidos diretamente na loja ou via PIX.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0">
          <div className="overflow-y-auto flex-1 pr-1 space-y-4 max-h-[60vh]">
            {/* Título */}
            {/* Título e Código Fiscal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="local-title">
                  Título do Produto <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="local-title"
                  type="text"
                  placeholder="Ex: Encordoamento D'Addario 0.10 EXL110"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="local-code" className="flex items-center justify-between">
                  <span>Código Fiscal / SKU</span>
                  <span className="text-[10px] text-muted-foreground">Opcional</span>
                </Label>
                <Input
                  id="local-code"
                  type="text"
                  placeholder="Ex: 10425"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Porte do Produto (Uber Direct) */}
            <div className="space-y-1.5 border rounded-lg p-3 bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50">
              <div className="flex items-center justify-between">
                <Label htmlFor="local-package-size" className="font-semibold text-xs flex items-center gap-1.5 text-purple-900 dark:text-purple-200">
                  <span>🛵 / 🚗 Transporte Uber Direct (Tamanho do Pacote)</span>
                </Label>
              </div>
              <Select
                value={packageSize}
                onValueChange={setPackageSize}
                disabled={isSubmitting}
              >
                <SelectTrigger id="local-package-size" className="bg-background">
                  <SelectValue placeholder="Selecione o porte do pacote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SMALL">
                    🛵 Pequeno (Moto) — Cordas, palhetas, afinadores, cabos, pedais (cabe na mochila)
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    📦 Médio (Moto/Carro) — Acessórios médios, caixas pequenas
                  </SelectItem>
                  <SelectItem value="LARGE">
                    🚗 Grande (Carro) — Violões, guitarras, baixos, teclados, amplificadores (porta-malas)
                  </SelectItem>
                  <SelectItem value="XLARGE">
                    🚚 Muito Grande (Carro/Utilitário) — Baterias, caixas acústicas grandes
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Define se a Uber priorizará motoboys (mais ágeis para itens pequenos) ou motoristas de carro (para instrumentos que não cabem em motos).
              </p>
            </div>

            {/* Preço e Estoque */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="local-price">
                  Preço de Venda (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="local-price"
                  type="text"
                  placeholder="Ex: 45,90"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="local-quantity">
                  Estoque Disponível (unidades) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="local-quantity"
                  type="number"
                  min="0"
                  placeholder="Ex: 12"
                  value={availableQuantity}
                  onChange={(e) => setAvailableQuantity(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Marca e Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="local-brand">Marca</Label>
                <Select
                  value={formBrand}
                  onValueChange={setFormBrand}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="local-brand">
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem marca definida</SelectItem>
                    {brands.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="local-category">Categoria Principal</Label>
                <Select
                  value={formMainCategory}
                  onValueChange={handleMainCategoryChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="local-category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {mainCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subcategoria (se houver) */}
            {availableSubcategories.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="local-subcategory">Subcategoria</Label>
                <Select
                  value={formSubCategory}
                  onValueChange={setFormSubCategory}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="local-subcategory">
                    <SelectValue placeholder="Selecione a subcategoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (usar categoria principal)</SelectItem>
                    {availableSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Imagem do Produto */}
            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
              <Label className="font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" /> Imagem do Produto
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label
                    htmlFor="image-file-input"
                    className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">
                      Clique para fazer upload
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      PNG, JPG ou WEBP até 5MB
                    </span>
                    <input
                      id="image-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Ou informe uma URL:</span>
                  <Input
                    type="url"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={imagePreview?.startsWith("data:") ? "" : imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setImagePreview(e.target.value || null);
                    }}
                    disabled={isSubmitting}
                  />
                  {imagePreview && (
                    <div className="mt-2 flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded border"
                      />
                      <span className="text-xs text-emerald-600 font-medium">
                        Imagem carregada
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="local-desc">Descrição / Detalhes do Produto</Label>
              <textarea
                id="local-desc"
                rows={3}
                placeholder="Ex: Jogo de cordas para guitarra elétrica, bitola 0.10-0.46, liga de níquel. Embalagem lacrada."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>

            {/* Retirada na Loja */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="local-pickup"
                checked={isLocalPickup}
                onCheckedChange={(checked) => setIsLocalPickup(Boolean(checked))}
                disabled={isSubmitting}
              />
              <Label htmlFor="local-pickup" className="text-sm cursor-pointer">
                Disponível para retirada imediata no balcão da loja física
              </Label>
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? uploadStatus || "Cadastrando..."
                : "Cadastrar Produto Local"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
