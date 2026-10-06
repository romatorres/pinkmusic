"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Search,
  Upload,
  RefreshCw,
  Loader2,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatZipCode } from "@/lib/shipping/normalize-zipcode";
import { STORE_SHIPPING_CONFIG } from "@/lib/shipping/config";

interface ShippingZone {
  id: string;
  name: string;
  description: string | null;
  minDistance: number;
  maxDistance: number;
  price: number;
  active: boolean;
  zipCodesCount?: number;
}

interface ShippingZipCode {
  id: string;
  zipCode: string;
  district: string;
  city: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  zoneId: string | null;
  zone?: {
    id: string;
    name: string;
    price: number;
  } | null;
}

function formatPrice(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export default function ShippingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"zones" | "zipcodes">("zones");

  // Dados
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [zipCodes, setZipCodes] = useState<ShippingZipCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginação e busca de CEPs
  const [zipSearch, setZipSearch] = useState("");
  const [zipZoneFilter, setZipZoneFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalZipCodes, setTotalZipCodes] = useState(0);

  // Modais de Zona
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
    minDistance: 0,
    maxDistance: 3,
    price: 8.9,
    active: true,
  });
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  // Modais de CEP
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [zipForm, setZipForm] = useState({
    zipCode: "",
    district: "",
    city: "Feira de Santana",
    state: "BA",
    latitude: "",
    longitude: "",
    zoneId: "",
  });
  const [zipSubmitting, setZipSubmitting] = useState(false);

  // Modal de Importação em Lote
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Carrega Zonas
  const fetchZones = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping/zones");
      const json = await res.json();
      if (json.success) {
        setZones(json.data);
      }
    } catch {
      toast.error("Erro ao carregar zonas de entrega.");
    }
  }, []);

  // Carrega CEPs
  const fetchZipCodes = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (zipSearch) params.set("search", zipSearch);
      if (zipZoneFilter) params.set("zoneId", zipZoneFilter);
      params.set("page", String(page));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/shipping/zipcodes?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setZipCodes(json.data);
        setTotalPages(json.meta.totalPages);
        setTotalZipCodes(json.meta.total);
      }
    } catch {
      toast.error("Erro ao carregar CEPs.");
    }
  }, [zipSearch, zipZoneFilter, page]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([fetchZones(), fetchZipCodes()]);
      setLoading(false);
    }
    loadAll();
  }, [fetchZones, fetchZipCodes]);

  // Abertura do modal de criação de zona
  const handleOpenCreateZone = () => {
    setEditingZone(null);
    const highestMax = zones.length > 0 ? Math.max(...zones.map((z) => z.maxDistance)) : 0;
    setZoneForm({
      name: `Zona ${zones.length + 1}`,
      description: "",
      minDistance: highestMax,
      maxDistance: highestMax + 3,
      price: 10,
      active: true,
    });
    setZoneModalOpen(true);
  };

  // Abertura do modal de edição de zona
  const handleOpenEditZone = (zone: ShippingZone) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      description: zone.description || "",
      minDistance: zone.minDistance,
      maxDistance: zone.maxDistance,
      price: zone.price,
      active: zone.active,
    });
    setZoneModalOpen(true);
  };

  // Salvar zona
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) {
      toast.error("Informe o nome da zona.");
      return;
    }
    if (zoneForm.minDistance < 0) {
      toast.error("Distância mínima não pode ser negativa.");
      return;
    }
    if (zoneForm.maxDistance <= zoneForm.minDistance) {
      toast.error("Distância máxima deve ser maior que a mínima.");
      return;
    }
    if (zoneForm.price < 0) {
      toast.error("Preço deve ser positivo.");
      return;
    }

    setZoneSubmitting(true);
    try {
      const url = editingZone
        ? `/api/admin/shipping/zones/${editingZone.id}`
        : `/api/admin/shipping/zones`;
      const method = editingZone ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(zoneForm),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(editingZone ? "Zona atualizada com sucesso!" : "Zona criada com sucesso!");
        setZoneModalOpen(false);
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao salvar zona.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar zona.");
    } finally {
      setZoneSubmitting(false);
    }
  };

  // Alternar status ativo da zona rapidamente
  const handleToggleZoneActive = async (zone: ShippingZone) => {
    try {
      const res = await fetch(`/api/admin/shipping/zones/${zone.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !zone.active }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Zona ${zone.name} ${!zone.active ? "ativada" : "desativada"}!`);
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao atualizar status da zona.");
      }
    } catch {
      toast.error("Erro ao alterar status da zona.");
    }
  };

  // Excluir zona
  const handleDeleteZone = async (zone: ShippingZone) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir "${zone.name}"? Os CEPs vinculados ficarão sem zona fixa.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/shipping/zones/${zone.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Zona excluída com sucesso.");
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao excluir zona.");
      }
    } catch {
      toast.error("Erro ao excluir zona.");
    }
  };

  // Salvar CEP individual
  const handleSaveZipCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = zipForm.zipCode.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (!zipForm.district.trim()) {
      toast.error("Informe o bairro do CEP.");
      return;
    }

    setZipSubmitting(true);
    try {
      const res = await fetch("/api/admin/shipping/zipcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...zipForm,
          zipCode: clean,
          latitude: zipForm.latitude ? Number(zipForm.latitude) : null,
          longitude: zipForm.longitude ? Number(zipForm.longitude) : null,
          zoneId: zipForm.zoneId || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("CEP cadastrado/atualizado com sucesso!");
        setZipModalOpen(false);
        setZipForm({
          zipCode: "",
          district: "",
          city: "Feira de Santana",
          state: "BA",
          latitude: "",
          longitude: "",
          zoneId: "",
        });
        fetchZipCodes();
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao salvar CEP.");
      }
    } catch {
      toast.error("Erro ao salvar CEP.");
    } finally {
      setZipSubmitting(false);
    }
  };

  // Excluir CEP
  const handleDeleteZipCode = async (id: string, zipCode: string) => {
    if (!confirm(`Deseja remover o CEP ${formatZipCode(zipCode)} da base?`)) return;

    try {
      const res = await fetch(`/api/admin/shipping/zipcodes/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("CEP removido.");
        fetchZipCodes();
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao remover CEP.");
      }
    } catch {
      toast.error("Erro ao remover CEP.");
    }
  };

  // Importação CSV / Linhas em lote
  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) {
      toast.error("Cole os dados CSV para importar.");
      return;
    }

    const lines = bulkCsvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items: Array<{
      zipCode: string;
      district?: string;
      city?: string;
      state?: string;
      latitude?: number;
      longitude?: number;
      zoneId?: string;
    }> = [];

    // Ignora cabeçalho se existir
    const startIndex = lines[0].toLowerCase().includes("zipcode") || lines[0].toLowerCase().includes("cep") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        const rawZip = parts[0];
        const district = parts[1];
        const city = parts[2] || "Feira de Santana";
        const state = parts[3] || "BA";
        const lat = parts[4] ? parseFloat(parts[4]) : undefined;
        const lng = parts[5] ? parseFloat(parts[5]) : undefined;
        items.push({
          zipCode: rawZip,
          district,
          city,
          state,
          latitude: !isNaN(lat as number) ? lat : undefined,
          longitude: !isNaN(lng as number) ? lng : undefined,
        });
      }
    }

    if (items.length === 0) {
      toast.error("Nenhuma linha válida encontrada no formato: CEP,Bairro,Cidade,Estado,Latitude,Longitude");
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/admin/shipping/zipcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk: true, items }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setBulkModalOpen(false);
        setBulkCsvText("");
        fetchZipCodes();
        fetchZones();
      } else {
        toast.error(json.error || "Erro na importação.");
      }
    } catch {
      toast.error("Erro ao enviar dados para importação.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  const activeZonesCount = zones.filter((z) => z.active).length;
  const maxCoveredKm = zones.length > 0 ? Math.max(...zones.filter((z) => z.active).map((z) => z.maxDistance), 0) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Entregas & Frete Local</h1>
              <p className="text-sm text-muted-foreground">
                Regras fixas de entrega em Feira de Santana - BA por distância e tabela de CEPs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchZones();
              fetchZipCodes();
            }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkModalOpen(true)}
            className="gap-1.5 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar CEPs (CSV)
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateZone}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova Zona
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Zonas Ativas</span>
            <Layers className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {activeZonesCount} / {zones.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Disponíveis no checkout</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Raio Máximo de Entrega</span>
            <MapPin className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {maxCoveredKm} km
          </p>
          <span className="text-[11px] text-muted-foreground">A partir do Centro / Kalilândia</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CEP de Origem</span>
            <Truck className="h-4 w-4 text-primary" />
          </div>
          <p className="text-lg font-mono font-bold mt-2 text-foreground">
            {STORE_SHIPPING_CONFIG.originZipCodeFormatted}
          </p>
          <span className="text-[11px] text-muted-foreground">Feira de Santana - BA</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CEPs Cadastrados</span>
            <Search className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {totalZipCodes}
          </p>
          <span className="text-[11px] text-muted-foreground">Mapeados na base local</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("zones")}
          className={`pb-3 relative transition-colors ${activeTab === "zones"
            ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          Zonas de Entrega ({zones.length})
        </button>
        <button
          onClick={() => setActiveTab("zipcodes")}
          className={`pb-3 relative transition-colors ${activeTab === "zipcodes"
            ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
            : "text-muted-foreground hover:text-foreground"
            }`}
        >
          CEPs & Regiões ({totalZipCodes})
        </button>
      </div>

      {/* ── CONTEÚDO TAB 1: ZONAS ────────────────────────────────────────── */}
      {activeTab === "zones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              O valor do frete é determinado pela zona correspondente à distância calculada a partir do ponto de origem da loja.
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : zones.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <Truck className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
              <p className="font-semibold text-foreground">Nenhuma zona de entrega cadastrada</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Crie a primeira zona para começar a cobrar frete local por distância.
              </p>
              <Button size="sm" onClick={handleOpenCreateZone} className="bg-purple-600 text-white">
                <Plus className="h-4 w-4 mr-1.5" /> Criar Zona
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`border rounded-xl p-5 bg-card shadow-xs transition-all relative flex flex-col justify-between ${zone.active ? "border-purple-200 dark:border-purple-900/50" : "opacity-60 bg-muted/20"
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                          {zone.name}
                        </h3>
                        {zone.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{zone.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${zone.active
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400"
                          }`}
                        title="Clique para alternar status"
                      >
                        {zone.active ? "Ativa" : "Inativa"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 py-2 border-y border-border/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Distância de atendimento:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {zone.minDistance} km <ArrowRight className="h-3 w-3 inline text-muted-foreground" />{" "}
                          {zone.maxDistance} km
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Preço do frete:</span>
                        <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(zone.price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">CEPs diretamente vinculados:</span>
                        <span className="font-medium text-foreground">
                          {zone.zipCodesCount ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditZone(zone)}
                      className="h-8 text-xs gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteZone(zone)}
                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONTEÚDO TAB 2: CEPS & REGIÕES ───────────────────────────────── */}
      {activeTab === "zipcodes" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CEP, bairro..."
                  value={zipSearch}
                  onChange={(e) => {
                    setZipSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9 text-sm"
                />
              </div>

              {zones.length > 0 && (
                <select
                  value={zipZoneFilter}
                  onChange={(e) => {
                    setZipZoneFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-9 px-3 text-xs rounded-md border border-input bg-background"
                >
                  <option value="">Todas as Zonas</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({formatPrice(z.price)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => setZipModalOpen(true)}
              className="gap-1.5 bg-purple-600 text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Cadastrar CEP
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CEP</th>
                    <th className="py-3 px-4">Bairro</th>
                    <th className="py-3 px-4">Cidade / UF</th>
                    <th className="py-3 px-4">Coordenadas</th>
                    <th className="py-3 px-4">Zona Fixa</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {zipCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum CEP encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    zipCodes.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {formatZipCode(item.zipCode)}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{item.district}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.city} - {item.state}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {item.latitude && item.longitude
                            ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          {item.zone ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {item.zone.name} ({formatPrice(item.zone.price)})
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Automática (por distância)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteZipCode(item.id, item.zipCode)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Remover CEP"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t bg-muted/20 text-xs">
                <span className="text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7 px-2 text-xs"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="h-7 px-2 text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: CRIAR / EDITAR ZONA ───────────────────────────────────── */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Editar Zona de Entrega" : "Nova Zona de Entrega"}</DialogTitle>
            <DialogDescription>
              Defina os limites de distância em km e o preço cobrado no checkout.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveZone} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="zone-name" className="text-xs">
                Nome da Zona <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zone-name"
                placeholder="Ex: Zona 1"
                value={zoneForm.name}
                onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="zone-desc" className="text-xs">
                Descrição ou Bairros Atendidos
              </Label>
              <Input
                id="zone-desc"
                placeholder="Ex: Centro e proximidades"
                value={zoneForm.description}
                onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="zone-min" className="text-xs">
                  Distância Mínima (km) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zone-min"
                  type="number"
                  step="0.1"
                  min="0"
                  value={zoneForm.minDistance}
                  onChange={(e) => setZoneForm({ ...zoneForm, minDistance: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="zone-max" className="text-xs">
                  Distância Máxima (km) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="zone-max"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={zoneForm.maxDistance}
                  onChange={(e) => setZoneForm({ ...zoneForm, maxDistance: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zone-price" className="text-xs">
                Preço do Frete (R$) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zone-price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={zoneForm.price}
                onChange={(e) => setZoneForm({ ...zoneForm, price: parseFloat(e.target.value) || 0 })}
                className="mt-1 font-semibold"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="zone-active"
                type="checkbox"
                checked={zoneForm.active}
                onChange={(e) => setZoneForm({ ...zoneForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="zone-active" className="text-xs cursor-pointer">
                Zona ativa para novas cotações
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setZoneModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={zoneSubmitting} className="bg-purple-600 text-white">
                {zoneSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {editingZone ? "Salvar Alterações" : "Criar Zona"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CADASTRAR CEP INDIVIDUAL ───────────────────────────────── */}
      <Dialog open={zipModalOpen} onOpenChange={setZipModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar CEP / Região</DialogTitle>
            <DialogDescription>
              Adicione um CEP com coordenadas ou associe diretamente a uma zona.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveZipCode} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="zip-code" className="text-xs">
                CEP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zip-code"
                placeholder="44000-000"
                value={zipForm.zipCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setZipForm({ ...zipForm, zipCode: digits });
                }}
                className="mt-1 font-mono tracking-wider"
                required
              />
            </div>

            <div>
              <Label htmlFor="zip-district" className="text-xs">
                Bairro <span className="text-red-500">*</span>
              </Label>
              <Input
                id="zip-district"
                placeholder="Ex: Kalilândia"
                value={zipForm.district}
                onChange={(e) => setZipForm({ ...zipForm, district: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="zip-city" className="text-xs">
                  Cidade
                </Label>
                <Input
                  id="zip-city"
                  value={zipForm.city}
                  onChange={(e) => setZipForm({ ...zipForm, city: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="zip-state" className="text-xs">
                  Estado (UF)
                </Label>
                <Input
                  id="zip-state"
                  maxLength={2}
                  value={zipForm.state}
                  onChange={(e) => setZipForm({ ...zipForm, state: e.target.value.toUpperCase() })}
                  className="mt-1 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="zip-lat" className="text-xs">
                  Latitude (Opcional)
                </Label>
                <Input
                  id="zip-lat"
                  type="number"
                  step="0.000001"
                  placeholder="-12.2576"
                  value={zipForm.latitude}
                  onChange={(e) => setZipForm({ ...zipForm, latitude: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>

              <div>
                <Label htmlFor="zip-lng" className="text-xs">
                  Longitude (Opcional)
                </Label>
                <Input
                  id="zip-lng"
                  type="number"
                  step="0.000001"
                  placeholder="-38.9634"
                  value={zipForm.longitude}
                  onChange={(e) => setZipForm({ ...zipForm, longitude: e.target.value })}
                  className="mt-1 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="zip-zone" className="text-xs">
                Zona de Entrega Específica (Opcional)
              </Label>
              <select
                id="zip-zone"
                value={zipForm.zoneId}
                onChange={(e) => setZipForm({ ...zipForm, zoneId: e.target.value })}
                className="w-full mt-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="">Automática (calculada por distância geográfica)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} - {formatPrice(z.price)} ({z.minDistance} a {z.maxDistance} km)
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setZipModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={zipSubmitting} className="bg-purple-600 text-white">
                {zipSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar CEP
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: IMPORTAÇÃO CSV EM LOTE ─────────────────────────────────── */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importação de CEPs em Lote</DialogTitle>
            <DialogDescription>
              Cole uma lista no formato CSV com colunas separadas por vírgula.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 font-mono text-muted-foreground border">
              <p className="font-semibold text-foreground">Formato esperado (1 por linha):</p>
              <p>CEP,Bairro,Cidade,Estado,Latitude,Longitude</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Exemplo: 44002000,Kalilândia,Feira de Santana,BA,-12.2576,-38.9634
              </p>
            </div>

            <textarea
              rows={8}
              placeholder="44002000,Kalilândia,Feira de Santana,BA,-12.2576,-38.9634&#10;44050000,Cidade Nova,Feira de Santana,BA,-12.2341,-38.9480"
              value={bulkCsvText}
              onChange={(e) => setBulkCsvText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-1 focus:ring-purple-500"
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleBulkImport}
                disabled={bulkSubmitting || !bulkCsvText.trim()}
                className="bg-purple-600 text-white"
              >
                {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Importar Lista
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
