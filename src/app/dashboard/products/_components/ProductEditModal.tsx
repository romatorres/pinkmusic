"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, RefreshCw, Store, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Brand, Category } from "@/lib/types";

interface ProductEditModalProps {
    productId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: Category[];
    brands: Brand[];
    onSuccess: (updatedProduct: ProductEditData) => void;
}

export interface ProductEditData {
    id: string;
    code?: string | null;
    title: string;
    price: number;
    available_quantity: number;
    categoryId?: string | null;
    brandId?: string | null;
    origin?: "MERCADO_LIVRE" | "LOCAL";
    description?: string | null;
    descriptionSource?: "CUSTOM" | "ML" | null;
    isLocalPickup?: boolean;
    thumbnail?: string | null;
    permalink?: string | null;
    condition?: string | null;
    category?: Category | null;
    brand?: Brand | null;
}

const emptyProduct: ProductEditData = {
    id: "",
    title: "",
    price: 0,
    available_quantity: 0,
    categoryId: null,
    brandId: null,
    origin: "MERCADO_LIVRE",
    description: null,
    descriptionSource: "ML",
    isLocalPickup: true,
    thumbnail: null,
    permalink: null,
    condition: "new",
    category: null,
    brand: null,
};

export function ProductEditModal({
    productId,
    open,
    onOpenChange,
    categories,
    brands,
    onSuccess,
}: ProductEditModalProps) {
    const [product, setProduct] = useState<ProductEditData>(emptyProduct);
    const [selectedMainCategoryId, setSelectedMainCategoryId] = useState("");
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reloadingML, setReloadingML] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");

    const mainCategories = categories.filter((category) => !category.parentId);
    const availableSubcategories = selectedMainCategoryId
        ? categories.filter((category) => category.parentId === selectedMainCategoryId)
        : [];

    useEffect(() => {
        if (!open || !productId) return;

        let cancelled = false;

        const loadProduct = async () => {
            setLoading(true);
            setSelectedFile(null);
            setImagePreview(null);
            setSelectedMainCategoryId("");
            setSelectedSubcategoryId("");

            try {
                const response = await fetch(`/api/products/${productId}`);
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || "Produto não encontrado.");
                }

                const data = result.data as ProductEditData;
                const currentCategory = data.categoryId
                    ? categories.find((category) => category.id === data.categoryId)
                    : null;

                if (!cancelled) {
                    setProduct({
                        ...data,
                        descriptionSource:
                            data.descriptionSource ||
                            (data.origin === "LOCAL" ? "CUSTOM" : "ML"),
                    });
                    setSelectedMainCategoryId(currentCategory?.parentId || currentCategory?.id || "");
                    setSelectedSubcategoryId(currentCategory?.parentId ? currentCategory.id : "");
                    setImagePreview(data.thumbnail || null);
                }
            } catch (error) {
                if (!cancelled) {
                    toast.error(
                        error instanceof Error ? error.message : "Erro ao carregar produto.",
                    );
                    onOpenChange(false);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadProduct();

        return () => {
            cancelled = true;
        };
    }, [categories, onOpenChange, open, productId]);

    const updateProductField = (
        event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    ) => {
        const { name, value } = event.target;
        setProduct((current) => ({
            ...current,
            [name]:
                name === "price" || name === "available_quantity"
                    ? parseFloat(value) || 0
                    : value,
        }));
    };

    const handleMainCategoryChange = (value: string) => {
        setSelectedMainCategoryId(value);
        setSelectedSubcategoryId("");
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Selecione um arquivo de imagem válido.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }

        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (event) => setImagePreview(event.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!productId || !product.title.trim()) return;

        setSaving(true);
        setUploadStatus("");

        try {
            let finalThumbnail = product.thumbnail || "";

            if (selectedFile) {
                setUploadStatus("Enviando nova imagem para o Cloudinary...");
                const formData = new FormData();
                formData.append("file", selectedFile);

                const uploadResponse = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                const uploadResult = await uploadResponse.json();

                if (!uploadResponse.ok || !uploadResult.success) {
                    throw new Error(uploadResult.error || "Falha ao enviar a imagem.");
                }

                finalThumbnail = uploadResult.url;
            }

            setUploadStatus("Salvando alterações...");
            const finalCategoryId = selectedSubcategoryId || selectedMainCategoryId || null;
            const response = await fetch(`/api/products/${productId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    code: product.code?.trim() || null,
                    title: product.title.trim(),
                    price: product.price,
                    available_quantity: product.available_quantity,
                    categoryId: finalCategoryId,
                    brandId: product.brandId || null,
                    origin: product.origin || "MERCADO_LIVRE",
                    description: product.description?.trim() || null,
                    descriptionSource: product.descriptionSource || "CUSTOM",
                    isLocalPickup: Boolean(product.isLocalPickup),
                    permalink: product.permalink?.trim() || null,
                    thumbnail: finalThumbnail,
                    condition: product.condition || "new",
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Não foi possível atualizar o produto.");
            }

            const updatedProduct = {
                ...result.data,
                category: categories.find((category) => category.id === finalCategoryId) || null,
                brand: brands.find((brand) => brand.id === product.brandId) || null,
            } as ProductEditData;

            toast.success("Produto atualizado com sucesso!");
            onSuccess(updatedProduct);
            handleClose();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Erro ao atualizar produto.",
            );
        } finally {
            setSaving(false);
            setUploadStatus("");
        }
    };

    const handleReloadFromML = async () => {
        if (!productId) return;

        setReloadingML(true);
        try {
            const response = await fetch(`/api/products/${productId}?forceRefresh=true`);
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || "Não foi possível consultar o Mercado Livre.");
            }

            setProduct((current) => ({
                ...current,
                price: result.data.price,
                available_quantity: result.data.available_quantity,
                title: result.data.title,
                permalink: result.data.permalink,
            }));
            toast.success("Preço e estoque atualizados do Mercado Livre!");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Erro ao consultar o Mercado Livre.",
            );
        } finally {
            setReloadingML(false);
        }
    };

    const handleClose = () => {
        if (saving) return;
        setSelectedFile(null);
        setImagePreview(null);
        setProduct(emptyProduct);
        onOpenChange(false);
    };

    const isLocal = product.origin === "LOCAL";

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => {
            if (!nextOpen) handleClose();
        }}>
            <DialogContent className="sm:max-w-3xl flex flex-col max-h-[94vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Store className="h-5 w-5" />
                        Editar produto
                    </DialogTitle>
                    <DialogDescription>
                        Altere os dados do produto sem recarregar a lista de produtos.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex min-h-64 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-5">
                        <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="md:col-span-2 gap-1 flex-col flex">
                                    <Label htmlFor="edit-title mb-1">Título do produto *</Label>
                                    <Input
                                        id="edit-title"
                                        name="title"
                                        value={product.title}
                                        onChange={updateProductField}
                                        required
                                        disabled={saving}
                                    />
                                </div>
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-code">Código Fiscal / SKU</Label>
                                    <Input
                                        id="edit-code"
                                        name="code"
                                        value={product.code || ""}
                                        onChange={updateProductField}
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-price">Preço de venda *</Label>
                                    <Input
                                        id="edit-price"
                                        name="price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={product.price}
                                        onChange={updateProductField}
                                        required
                                        disabled={saving}
                                    />
                                </div>
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-quantity">Quantidade em estoque *</Label>
                                    <Input
                                        id="edit-quantity"
                                        name="available_quantity"
                                        type="number"
                                        min="0"
                                        value={product.available_quantity}
                                        onChange={updateProductField}
                                        required
                                        disabled={saving}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-main-category">Categoria principal</Label>
                                    <Select
                                        value={selectedMainCategoryId}
                                        onValueChange={handleMainCategoryChange}
                                        disabled={saving}
                                    >
                                        <SelectTrigger id="edit-main-category">
                                            <SelectValue placeholder="Selecione uma categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mainCategories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-subcategory">Subcategoria</Label>
                                    <Select
                                        value={selectedSubcategoryId}
                                        onValueChange={setSelectedSubcategoryId}
                                        disabled={saving || !selectedMainCategoryId || availableSubcategories.length === 0}
                                    >
                                        <SelectTrigger id="edit-subcategory">
                                            <SelectValue placeholder="Selecione uma subcategoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nenhuma (categoria principal)</SelectItem>
                                            {availableSubcategories.map((category) => (
                                                <SelectItem key={category.id} value={category.id}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-brand">Marca</Label>
                                    <Select
                                        value={product.brandId || ""}
                                        onValueChange={(value) => updateProductField({
                                            target: { name: "brandId", value },
                                        } as React.ChangeEvent<HTMLSelectElement>)}
                                        disabled={saving}
                                    >
                                        <SelectTrigger id="edit-brand">
                                            <SelectValue placeholder="Selecione uma marca" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Nenhuma</SelectItem>
                                            {brands.map((brand) => (
                                                <SelectItem key={brand.id} value={brand.id}>
                                                    {brand.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-origin">Canal / origem</Label>
                                    <Select
                                        value={product.origin || "MERCADO_LIVRE"}
                                        onValueChange={(value) => updateProductField({
                                            target: { name: "origin", value },
                                        } as React.ChangeEvent<HTMLSelectElement>)}
                                        disabled={saving || !isLocal}
                                    >
                                        <SelectTrigger id="edit-origin">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="LOCAL">Estoque local / balcão</SelectItem>
                                            <SelectItem value="MERCADO_LIVRE">Mercado Livre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="gap-1 flex-col flex">
                                <Label htmlFor="edit-permalink">Link do Mercado Livre</Label>
                                <Input
                                    id="edit-permalink"
                                    name="permalink"
                                    type="url"
                                    value={product.permalink || ""}
                                    onChange={updateProductField}
                                    disabled={saving || isLocal}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="gap-1 flex-col flex">
                                    <Label htmlFor="edit-description-source">Fonte da descrição</Label>
                                    <Select
                                        value={product.descriptionSource || "CUSTOM"}
                                        onValueChange={(value) => setProduct((current) => ({
                                            ...current,
                                            descriptionSource: value as "CUSTOM" | "ML",
                                        }))}
                                        disabled={saving}
                                    >
                                        <SelectTrigger id="edit-description-source">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CUSTOM">Descrição personalizada</SelectItem>
                                            <SelectItem value="ML">Descrição do Mercado Livre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2 rounded-lg border p-3">
                                    <Checkbox
                                        id="edit-local-pickup"
                                        checked={Boolean(product.isLocalPickup)}
                                        onCheckedChange={(checked) => setProduct((current) => ({
                                            ...current,
                                            isLocalPickup: Boolean(checked),
                                        }))}
                                        disabled={saving}
                                    />
                                    <Label htmlFor="edit-local-pickup" className="cursor-pointer text-sm">
                                        Disponível para retirada no balcão
                                    </Label>
                                </div>
                            </div>

                            {(product.descriptionSource === "CUSTOM" || isLocal) && (
                                <div className="gap-1.5 flex-col flex">
                                    <Label htmlFor="edit-description">Descrição detalhada</Label>
                                    <textarea
                                        id="edit-description"
                                        name="description"
                                        rows={4}
                                        value={product.description || ""}
                                        onChange={updateProductField}
                                        className="w-full rounded-md border border-input bg-popover/80 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={saving}
                                    />
                                </div>
                            )}

                            <div className="rounded-xl border bg-muted/20 p-4">
                                <Label className="mb-3 flex items-center gap-2 font-semibold">
                                    <ImageIcon className="h-4 w-4" /> Imagem principal
                                </Label>
                                <div className="grid gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
                                    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border bg-background p-2">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Prévia da imagem" className="h-20 w-20 object-contain" />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Sem imagem</span>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <label className="bg-popover/60 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-card-foreground/30 border-dashed p-3 text-sm hover:border-primary/60 hover:bg-primary/5">
                                            <Upload className="h-4 w-4" />
                                            Trocar imagem
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                disabled={saving}
                                            />
                                        </label>
                                        <Input
                                            type="url"
                                            value={selectedFile ? "" : product.thumbnail || ""}
                                            onChange={(event) => {
                                                setSelectedFile(null);
                                                setImagePreview(event.target.value || null);
                                                setProduct((current) => ({ ...current, thumbnail: event.target.value }));
                                            }}
                                            placeholder="https://..."
                                            disabled={saving}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isLocal && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleReloadFromML}
                                disabled={saving || reloadingML}
                                className="w-full"
                            >
                                <RefreshCw className={`h-4 w-4 ${reloadingML ? "animate-spin" : ""}`} />
                                {reloadingML ? "Consultando Mercado Livre..." : "Recarregar preço e estoque do Mercado Livre"}
                            </Button>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={saving}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                {saving ? uploadStatus || "Salvando..." : "Salvar alterações"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
