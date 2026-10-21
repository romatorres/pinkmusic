"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bike,
  Plus,
  Search,
  Phone,
  CreditCard,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Receipt,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Courier {
  id: string;
  name: string;
  phone: string;
  pixKey: string | null;
  pixKeyType: string | null;
  vehicle: string | null;
  plate: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
  _count?: {
    rides: number;
  };
}

export default function CouriersPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");

  // Modal de Cadastro/Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    pixKey: "",
    pixKeyType: "CPF",
    vehicle: "",
    plate: "",
    notes: "",
    active: true,
  });

  const [isPending, startTransition] = useTransition();

  const loadCouriers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/couriers");
      const data = await res.json();
      if (res.ok && data.success) {
        setCouriers(data.data);
      } else {
        toast.error(data.error || "Erro ao carregar entregadores");
      }
    } catch {
      toast.error("Erro de conexão ao carregar entregadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  const handleOpenCreate = () => {
    setEditingCourier(null);
    setFormData({
      name: "",
      phone: "",
      pixKey: "",
      pixKeyType: "CPF",
      vehicle: "Moto",
      plate: "",
      notes: "",
      active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      name: courier.name,
      phone: courier.phone,
      pixKey: courier.pixKey || "",
      pixKeyType: courier.pixKeyType || "CPF",
      vehicle: courier.vehicle || "",
      plate: courier.plate || "",
      notes: courier.notes || "",
      active: courier.active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Nome e WhatsApp são obrigatórios!");
      return;
    }

    startTransition(async () => {
      try {
        const url = editingCourier
          ? `/api/couriers/${editingCourier.id}`
          : "/api/couriers";
        const method = editingCourier ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          toast.success(
            editingCourier
              ? "Entregador atualizado!"
              : "Entregador cadastrado com sucesso!"
          );
          setIsModalOpen(false);
          loadCouriers();
        } else {
          toast.error(data.error || "Erro ao salvar entregador");
        }
      } catch {
        toast.error("Erro ao salvar dados");
      }
    });
  };

  const handleToggleActive = async (courier: Courier) => {
    try {
      const res = await fetch(`/api/couriers/${courier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !courier.active }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          courier.active ? "Entregador desativado" : "Entregador reativado"
        );
        loadCouriers();
      } else {
        toast.error(data.error || "Erro ao alterar status");
      }
    } catch {
      toast.error("Falha ao comunicar com o servidor");
    }
  };

  const handleDelete = async (courier: Courier) => {
    if (
      !confirm(
        `Deseja realmente remover o entregador "${courier.name}"? Se houver histórico de corridas, ele será inativado para manter os registros.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/couriers/${courier.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || "Entregador removido!");
        loadCouriers();
      } else {
        toast.error(data.error || "Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao processar exclusão");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

  // Filtros
  const filteredCouriers = couriers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.plate && c.plate.toLowerCase().includes(search.toLowerCase())) ||
      (c.pixKey && c.pixKey.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      filterActive === "ALL"
        ? true
        : filterActive === "ACTIVE"
          ? c.active
          : !c.active;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Gestão de Motoboys
              </h1>
              <p className="text-sm text-muted-foreground">
                Cadastre entregadores, vincule corridas e feche as contas por período
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/couriers/settlement">
            <Button
              variant="outline"
              className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
            >
              <Receipt className="w-4 h-4" />
              <span>Fechamento de Fretes</span>
            </Button>
          </Link>

          <Button onClick={handleOpenCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Novo Motoboy</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, placa ou Pix..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button
            size="sm"
            variant={filterActive === "ACTIVE" ? "default" : "outline"}
            onClick={() => setFilterActive("ACTIVE")}
          >
            Ativos ({couriers.filter((c) => c.active).length})
          </Button>
          <Button
            size="sm"
            variant={filterActive === "INACTIVE" ? "default" : "outline"}
            onClick={() => setFilterActive("INACTIVE")}
          >
            Inativos ({couriers.filter((c) => !c.active).length})
          </Button>
          <Button
            size="sm"
            variant={filterActive === "ALL" ? "default" : "outline"}
            onClick={() => setFilterActive("ALL")}
          >
            Todos ({couriers.length})
          </Button>
        </div>
      </div>

      {/* Lista de Motoboys */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-border/60 bg-card p-5 animate-pulse"
            />
          ))}
        </div>
      ) : filteredCouriers.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-muted/10 border-dashed border-border/80">
          <Bike className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold text-lg">Nenhum motoboy encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {search
              ? "Nenhum resultado corresponde à sua pesquisa."
              : "Cadastre seu primeiro motoboy para começar a vincular pedidos e controlar fretes."}
          </p>
          {!search && (
            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Cadastrar Motoboy
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCouriers.map((courier) => (
            <div
              key={courier.id}
              className={`rounded-2xl border bg-card p-5 shadow-xs transition-all flex flex-col justify-between hover:shadow-md ${courier.active
                ? "border-border/80"
                : "border-destructive/30 bg-destructive/5 opacity-80"
                }`}
            >
              <div>
                {/* Topo do Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg ${courier.active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {courier.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base leading-snug">
                        {courier.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{courier.vehicle || "Moto"}</span>
                        {courier.plate && (
                          <>
                            <span>•</span>
                            <span className="font-mono bg-muted px-1.5 py-0.2 rounded font-semibold text-[11px]">
                              {courier.plate}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${courier.active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-500/10 text-zinc-500"
                      }`}
                  >
                    {courier.active ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Inativo
                      </>
                    )}
                  </span>
                </div>

                {/* Detalhes de Contato e Chave Pix */}
                <div className="space-y-2 py-2 text-xs border-y border-border/50 my-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> WhatsApp:
                    </span>
                    <a
                      href={`https://wa.me/55${courier.phone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" />
                      {courier.phone}
                    </a>
                  </div>

                  {courier.pixKey && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Pix ({courier.pixKeyType || "Chave"}):
                      </span>
                      <button
                        onClick={() => copyToClipboard(courier.pixKey!, "Chave Pix")}
                        className="font-mono text-[11px] bg-muted/60 hover:bg-muted px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors"
                        title="Clique para copiar a chave Pix"
                      >
                        <span className="truncate max-w-[130px]">{courier.pixKey}</span>
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {courier._count && (
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-muted-foreground">Total de corridas:</span>
                      <span className="font-bold text-foreground">
                        {courier._count.rides} realizada(s)
                      </span>
                    </div>
                  )}

                  {courier.notes && (
                    <p className="text-[11px] text-muted-foreground/80 italic pt-1 truncate">
                      Obs: {courier.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Ações do Card */}
              <div className="flex items-center justify-between gap-2 pt-2">
                <Link
                  href={`/dashboard/couriers/settlement?courierId=${courier.id}`}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Ver Fretes
                </Link>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenEdit(courier)}
                    title="Editar dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${courier.active
                      ? "text-zinc-500 hover:text-amber-600"
                      : "text-zinc-500 hover:text-emerald-600"
                      }`}
                    onClick={() => handleToggleActive(courier)}
                    title={courier.active ? "Desativar" : "Reativar"}
                  >
                    {courier.active ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(courier)}
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCourier ? "Editar Motoboy" : "Cadastrar Novo Motoboy"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div>
              <Label htmlFor="name" className="mb-2">Nome Completo *</Label>
              <Input
                id="name"
                required
                placeholder="Ex: Carlos Eduardo Silva"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="phone" className="mb-2">WhatsApp / Telefone *</Label>
              <Input
                id="phone"
                required
                placeholder="Ex: 11988887777 (apenas números com DDD)"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vehicle" className="mb-2">Veículo</Label>
                <Input
                  id="vehicle"
                  placeholder="Ex: Honda CG 160"
                  value={formData.vehicle}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="plate" className="mb-2">Placa da Moto</Label>
                <Input
                  id="plate"
                  placeholder="Ex: BRA2E19"
                  value={formData.plate}
                  onChange={(e) =>
                    setFormData({ ...formData, plate: e.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="pixKeyType" className="mb-2">Tipo Pix</Label>
                <select
                  id="pixKeyType"
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.pixKeyType}
                  onChange={(e) =>
                    setFormData({ ...formData, pixKeyType: e.target.value })
                  }
                >
                  <option value="CPF">CPF</option>
                  <option value="PHONE">Telefone</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="RANDOM">Chave Aleatória</option>
                  <option value="CNPJ">CNPJ</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="pixKey" className="mb-2">Chave Pix</Label>
                <Input
                  id="pixKey"
                  placeholder="Chave para pagamento das corridas"
                  value={formData.pixKey}
                  onChange={(e) =>
                    setFormData({ ...formData, pixKey: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes" className="mb-2">Observações internas</Label>
              <Input
                id="notes"
                placeholder="Ex: Disponível terças e quintas à tarde"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar Entregador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
