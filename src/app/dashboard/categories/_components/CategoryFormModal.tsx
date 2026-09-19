"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Category } from "@/lib/types";

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

// ─── Schemas ────────────────────────────────────────────────────────────────

const mainSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da categoria é obrigatório." })
    .min(3, { message: "A categoria deve ter pelo menos 3 caracteres." }),
});

const subSchema = z.object({
  name: z
    .string()
    .min(1, { message: "O nome da subcategoria é obrigatório." })
    .min(3, { message: "A subcategoria deve ter pelo menos 3 caracteres." }),
  parentId: z
    .string()
    .min(1, { message: "Selecione uma categoria pai." }),
});

type MainFormInputs = z.infer<typeof mainSchema>;
type SubFormInputs = z.infer<typeof subSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "main" = Categoria Principal | "sub" = Subcategoria */
  mode: "main" | "sub";
  /** Se fornecido, o modal entra em modo de edição */
  category?: Category | null;
  /** Lista de categorias principais — necessário apenas para mode="sub" */
  mainCategories: Category[];
  /** Chamado após save bem-sucedido para reload da listagem */
  onSuccess: () => void;
}

// ─── Formulário de Categoria Principal ──────────────────────────────────────

function MainCategoryForm({
  category,
  onSuccess,
  onClose,
}: {
  category?: Category | null;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(category);

  const form = useForm<MainFormInputs>({
    resolver: zodResolver(mainSchema),
    defaultValues: { name: "" },
  });

  // Preenche o form quando entra em modo edição
  useEffect(() => {
    if (category) {
      form.reset({ name: category.name });
    } else {
      form.reset({ name: "" });
    }
  }, [category, form]);

  const onSubmit = async (data: MainFormInputs) => {
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit && category ? `/api/categories/${category.id}` : "/api/categories";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, parentId: null }),
    });

    if (res.ok) {
      toast.success(`Categoria ${isEdit ? "atualizada" : "criada"} com sucesso!`);
      onSuccess();
      onClose();
    } else {
      toast.error("Ocorreu um erro ao salvar a categoria.");
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 min-h-0">
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Categoria Principal</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Guitarras, Teclados, Percussão..."
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit ? "Salvando..." : "Criando..."
              : isEdit ? "Salvar Alterações" : "Criar Categoria"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Formulário de Subcategoria ───────────────────────────────────────────────

function SubCategoryForm({
  category,
  mainCategories,
  onSuccess,
  onClose,
}: {
  category?: Category | null;
  mainCategories: Category[];
  onSuccess: () => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(category);

  const form = useForm<SubFormInputs>({
    resolver: zodResolver(subSchema),
    defaultValues: { name: "", parentId: "" },
  });

  // Preenche o form quando entra em modo edição
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        parentId: category.parentId || "",
      });
    } else {
      form.reset({ name: "", parentId: "" });
    }
  }, [category, form]);

  const onSubmit = async (data: SubFormInputs) => {
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit && category ? `/api/categories/${category.id}` : "/api/categories";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, parentId: data.parentId }),
    });

    if (res.ok) {
      toast.success(`Subcategoria ${isEdit ? "atualizada" : "criada"} com sucesso!`);
      onSuccess();
      onClose();
    } else {
      toast.error("Ocorreu um erro ao salvar a subcategoria.");
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 min-h-0">
        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Subcategoria</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Guitarras Elétricas, Pedais de Efeito..."
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria Pai</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione a Categoria Principal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {mainCategories.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Cadastre primeiro uma Categoria Principal
                      </SelectItem>
                    ) : (
                      mainCategories.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit ? "Salvando..." : "Criando..."
              : isEdit ? "Salvar Alterações" : "Criar Subcategoria"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

// ─── Modal Container ─────────────────────────────────────────────────────────

export function CategoryFormModal({
  open,
  onOpenChange,
  mode,
  category,
  mainCategories,
  onSuccess,
}: CategoryFormModalProps) {
  const isEdit = Boolean(category);

  const title =
    mode === "main"
      ? isEdit ? "Editar Categoria Principal" : "Nova Categoria Principal"
      : isEdit ? "Editar Subcategoria" : "Nova Subcategoria";

  const description =
    mode === "main"
      ? "Categorias principais são os grupos raiz do catálogo (ex: Guitarras, Teclados, Áudio)."
      : "Subcategorias pertencem a uma Categoria Principal (ex: Guitarras Elétricas → Guitarras).";

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Renderiza formulário isolado por mode — zero risco de estado cruzado */}
        {mode === "main" ? (
          <MainCategoryForm
            key={category?.id ?? "new-main"}
            category={category}
            onSuccess={onSuccess}
            onClose={handleClose}
          />
        ) : (
          <SubCategoryForm
            key={category?.id ?? "new-sub"}
            category={category}
            mainCategories={mainCategories}
            onSuccess={onSuccess}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
