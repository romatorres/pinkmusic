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
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Building2,
  Sliders,
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
  order: number;
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
  zoneId: string | null;
  source: string | null;
  confidence: string | null;
  zone?: {
    id: string;
    order: number;
    name: string;
    price: number;
  } | null;
}

interface ShippingNeighborhood {
  id: string;
  name: string;
  normalizedKey: string;
  aliases: string[];
  zoneOrder: number | null;
  outOfArea: boolean;
  zone?: {
    id: string;
    order: number;
    name: string;
    price: number;
  } | null;
}

interface ShippingUnresolvedZip {
  id: string;
  zipCode: string;
  district: string | null;
  city: string | null;
  state: string | null;
  reason: string;
  hitCount: number;
  updatedAt: string;
}

interface ShippingZipOverride {
  id: string;
  zipCode: string;
  district: string;
  zoneOrder: number;
  note: string | null;
}

function formatPrice(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

function renderSourceBadge(source: string | null) {
  switch (source) {
    case "local_json":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
          Base Local (0ms)
        </span>
      );
    case "viacep":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
          ViaCEP
        </span>
      );
    case "brasilapi":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
          BrasilAPI
        </span>
      );
    case "neighbor_interp":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          Interpolação
        </span>
      );
    case "zip_prefix":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
          Prefixo CEP
        </span>
      );
    case "zip_override":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          Override Manual
        </span>
      );
    default:
      return <span className="text-muted-foreground text-[11px]">Sistema</span>;
  }
}

function renderConfidenceBadge(confidence: string | null) {
  switch (confidence) {
    case "high":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Alta
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" /> Média
        </span>
      );
    case "low":
    case "none":
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500">
          <HelpCircle className="h-3 w-3" /> Baixa
        </span>
      );
    default:
      return <span className="text-muted-foreground text-[11px]">Alta</span>;
  }
}

export default function ShippingSettingsPage() {
  const [activeTab, setActiveTab] = useState<"zones" | "neighborhoods" | "zipcodes" | "unresolved" | "overrides">("zones");

  // Dados
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<ShippingNeighborhood[]>([]);
  const [zipCodes, setZipCodes] = useState<ShippingZipCode[]>([]);
  const [unresolvedZips, setUnresolvedZips] = useState<ShippingUnresolvedZip[]>([]);
  const [overrides, setOverrides] = useState<ShippingZipOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // Paginação e busca de CEPs
  const [zipSearch, setZipSearch] = useState("");
  const [zipZoneFilter, setZipZoneFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalZipCodes, setTotalZipCodes] = useState(0);

  // Busca e filtro de Bairros
  const [neighborhoodSearch, setNeighborhoodSearch] = useState("");
  const [neighborhoodZoneFilter, setNeighborhoodZoneFilter] = useState<string>("");

  // Modais de Zona
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneForm, setZoneForm] = useState({
    name: "",
    description: "",
    minDistance: 0,
    maxDistance: 3,
    price: 10,
    active: true,
  });
  const [zoneSubmitting, setZoneSubmitting] = useState(false);
  const [deleteZoneConfirmOpen, setDeleteZoneConfirmOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<ShippingZone | null>(null);

  // Modais de CEP Individual
  const [zipModalOpen, setZipModalOpen] = useState(false);
  const [zipForm, setZipForm] = useState({
    zipCode: "",
    district: "",
    city: "Feira de Santana",
    state: "BA",
    zoneId: "",
  });
  const [zipSubmitting, setZipSubmitting] = useState(false);
  const [deleteZipConfirmOpen, setDeleteZipConfirmOpen] = useState(false);
  const [zipToDelete, setZipToDelete] = useState<{ id: string; zipCode: string } | null>(null);

  // Modal de Importação em Lote
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Modal de Bairro
  const [neighborhoodModalOpen, setNeighborhoodModalOpen] = useState(false);
  const [editingNeighborhood, setEditingNeighborhood] = useState<ShippingNeighborhood | null>(null);
  const [neighborhoodForm, setNeighborhoodForm] = useState({
    name: "",
    zoneOrder: "1",
    outOfArea: false,
  });
  const [neighborhoodSubmitting, setNeighborhoodSubmitting] = useState(false);

  // Modal de Override Manual
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    zipCode: "",
    district: "",
    zoneOrder: "1",
    note: "",
  });
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

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

  // Carrega Bairros
  const fetchNeighborhoods = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping/neighborhoods");
      const json = await res.json();
      if (json.success) {
        setNeighborhoods(json.data);
      }
    } catch {
      toast.error("Erro ao carregar bairros.");
    }
  }, []);

  // Carrega CEPs em Cache
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

  // Carrega CEPs Não Resolvidos
  const fetchUnresolvedZips = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping/unresolved");
      const json = await res.json();
      if (json.success) {
        setUnresolvedZips(json.data);
      }
    } catch {
      toast.error("Erro ao carregar CEPs pendentes.");
    }
  }, []);

  // Carrega Overrides Manuais
  const fetchOverrides = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/shipping/overrides");
      const json = await res.json();
      if (json.success) {
        setOverrides(json.data);
      }
    } catch {
      toast.error("Erro ao carregar overrides de CEP.");
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      await Promise.all([
        fetchZones(),
        fetchNeighborhoods(),
        fetchZipCodes(),
        fetchUnresolvedZips(),
        fetchOverrides(),
      ]);
      setLoading(false);
    }
    loadAll();
  }, [fetchZones, fetchNeighborhoods, fetchZipCodes, fetchUnresolvedZips, fetchOverrides]);

  // Salvar / Criar Zona
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

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneForm.name.trim()) {
      toast.error("Informe o nome da zona.");
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
        toast.success(editingZone ? "Zona atualizada!" : "Zona criada com sucesso!");
        setZoneModalOpen(false);
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao salvar zona.");
      }
    } catch {
      toast.error("Erro ao salvar zona.");
    } finally {
      setZoneSubmitting(false);
    }
  };

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

  const confirmDeleteZone = async () => {
    if (!zoneToDelete) return;
    try {
      const res = await fetch(`/api/admin/shipping/zones/${zoneToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Zona excluída.");
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao excluir zona.");
      }
    } catch {
      toast.error("Erro ao excluir zona.");
    } finally {
      setDeleteZoneConfirmOpen(false);
      setZoneToDelete(null);
    }
  };

  // Salvar Bairro
  const handleOpenEditNeighborhood = (n: ShippingNeighborhood) => {
    setEditingNeighborhood(n);
    setNeighborhoodForm({
      name: n.name,
      zoneOrder: n.zoneOrder ? String(n.zoneOrder) : "1",
      outOfArea: n.outOfArea,
    });
    setNeighborhoodModalOpen(true);
  };

  const handleSaveNeighborhood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!neighborhoodForm.name.trim()) {
      toast.error("Informe o nome do bairro.");
      return;
    }
    setNeighborhoodSubmitting(true);
    try {
      const res = await fetch("/api/admin/shipping/neighborhoods", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingNeighborhood?.id,
          name: neighborhoodForm.name.trim(),
          zoneOrder: neighborhoodForm.outOfArea ? null : parseInt(neighborhoodForm.zoneOrder, 10),
          outOfArea: neighborhoodForm.outOfArea,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Bairro salvo com sucesso!");
        setNeighborhoodModalOpen(false);
        fetchNeighborhoods();
      } else {
        toast.error(json.error || "Erro ao salvar bairro.");
      }
    } catch {
      toast.error("Erro de conexão ao salvar bairro.");
    } finally {
      setNeighborhoodSubmitting(false);
    }
  };

  // Salvar CEP Individual
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
          zipCode: clean,
          district: zipForm.district.trim(),
          city: zipForm.city.trim(),
          state: zipForm.state.trim(),
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

  const confirmDeleteZipCode = async () => {
    if (!zipToDelete) return;
    try {
      const res = await fetch(`/api/admin/shipping/zipcodes/${zipToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("CEP removido do cache.");
        fetchZipCodes();
        fetchZones();
      } else {
        toast.error(json.error || "Erro ao remover CEP.");
      }
    } catch {
      toast.error("Erro ao remover CEP.");
    } finally {
      setDeleteZipConfirmOpen(false);
      setZipToDelete(null);
    }
  };

  // Importação CSV em Lote
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
    }> = [];

    const startIndex = lines[0].toLowerCase().includes("cep") || lines[0].toLowerCase().includes("zipcode") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(",").map((p) => p.trim());
      if (parts.length >= 2) {
        items.push({
          zipCode: parts[0],
          district: parts[1],
          city: parts[2] || "Feira de Santana",
          state: parts[3] || "BA",
        });
      }
    }

    if (items.length === 0) {
      toast.error("Nenhuma linha válida no formato: CEP,Bairro,Cidade,Estado");
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

  // Salvar Override Manual
  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = overrideForm.zipCode.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (!overrideForm.district.trim()) {
      toast.error("Informe o bairro.");
      return;
    }

    setOverrideSubmitting(true);
    try {
      const res = await fetch("/api/admin/shipping/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCode: clean,
          district: overrideForm.district.trim(),
          zoneOrder: parseInt(overrideForm.zoneOrder, 10),
          note: overrideForm.note.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Override de CEP salvo com sucesso!");
        setOverrideModalOpen(false);
        setOverrideForm({ zipCode: "", district: "", zoneOrder: "1", note: "" });
        fetchOverrides();
      } else {
        toast.error(json.error || "Erro ao salvar override.");
      }
    } catch {
      toast.error("Erro ao salvar override.");
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shipping/overrides?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Override removido.");
        fetchOverrides();
      } else {
        toast.error(json.error || "Erro ao remover override.");
      }
    } catch {
      toast.error("Erro ao remover override.");
    }
  };

  const handleDeleteUnresolved = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/shipping/unresolved?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Item removido da auditoria.");
        fetchUnresolvedZips();
      } else {
        toast.error(json.error || "Erro ao remover item.");
      }
    } catch {
      toast.error("Erro ao remover.");
    }
  };

  const activeZonesCount = zones.filter((z) => z.active).length;
  const filteredNeighborhoods = neighborhoods.filter((n) => {
    const matchSearch =
      n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase()) ||
      n.normalizedKey.includes(neighborhoodSearch.toLowerCase());
    const matchZone =
      neighborhoodZoneFilter === ""
        ? true
        : neighborhoodZoneFilter === "rural"
        ? n.outOfArea
        : n.zoneOrder === parseInt(neighborhoodZoneFilter, 10);
    return matchSearch && matchZone;
  });

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
                Regras determinísticas de entrega para Feira de Santana - BA por Bairros e Zonas.
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
              fetchNeighborhoods();
              fetchZipCodes();
              fetchUnresolvedZips();
              fetchOverrides();
              toast.success("Dados atualizados.");
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
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Importar CEPs
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenCreateZone}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
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
          <span className="text-[11px] text-muted-foreground">Zonas 1 a 4 configuradas</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Bairros Cadastrados</span>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {neighborhoods.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Classificados no sistema</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CEPs no Cache</span>
            <Search className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {totalZipCodes}
          </p>
          <span className="text-[11px] text-muted-foreground">Consultas em 0ms</span>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>CEPs Pendentes (Auditoria)</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">
            {unresolvedZips.length}
          </p>
          <span className="text-[11px] text-muted-foreground">Demandas sem bairro mapeado</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6 text-sm font-medium overflow-x-auto">
        <button
          onClick={() => setActiveTab("zones")}
          className={`pb-3 relative transition-colors whitespace-nowrap ${
            activeTab === "zones"
              ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Zonas de Entrega ({zones.length})
        </button>

        <button
          onClick={() => setActiveTab("neighborhoods")}
          className={`pb-3 relative transition-colors whitespace-nowrap ${
            activeTab === "neighborhoods"
              ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Bairros de Feira ({neighborhoods.length})
        </button>

        <button
          onClick={() => setActiveTab("zipcodes")}
          className={`pb-3 relative transition-colors whitespace-nowrap ${
            activeTab === "zipcodes"
              ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Cache de CEPs ({totalZipCodes})
        </button>

        <button
          onClick={() => setActiveTab("unresolved")}
          className={`pb-3 relative transition-colors whitespace-nowrap ${
            activeTab === "unresolved"
              ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          CEPs Pendentes ({unresolvedZips.length})
        </button>

        <button
          onClick={() => setActiveTab("overrides")}
          className={`pb-3 relative transition-colors whitespace-nowrap ${
            activeTab === "overrides"
              ? "text-purple-600 dark:text-purple-400 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-600"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Overrides Manuais ({overrides.length})
        </button>
      </div>

      {/* ── CONTEÚDO TAB 1: ZONAS ────────────────────────────────────────── */}
      {activeTab === "zones" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              As 4 zonas oficiais de Feira de Santana. Os preços e status ativos são aplicados instantaneamente no checkout.
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
              <Button variant="default" size="sm" onClick={handleOpenCreateZone} className="mt-3">
                <Plus className="h-4 w-4 mr-1.5" /> Criar Zona
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`border rounded-xl p-5 bg-card shadow-xs transition-all flex flex-col justify-between ${
                    zone.active ? "border-purple-200 dark:border-purple-900/50" : "opacity-60 bg-muted/20"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                            Ordem {zone.order}
                          </span>
                          <h3 className="font-bold text-lg text-foreground">{zone.name}</h3>
                        </div>
                        {zone.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{zone.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                          zone.active
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                            : "bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400"
                        }`}
                        title="Clique para ativar/desativar"
                      >
                        {zone.active ? "Ativa" : "Inativa"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-2 py-2 border-y border-border/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Raio Nominal:</span>
                        <span className="font-semibold text-foreground flex items-center gap-1">
                          {zone.minDistance} km <ArrowRight className="h-3 w-3 inline text-muted-foreground" />{" "}
                          {zone.maxDistance} km
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Preço do frete:</span>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(zone.price)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">CEPs em cache:</span>
                        <span className="font-medium text-foreground">{zone.zipCodesCount ?? 0}</span>
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
                      onClick={() => {
                        setZoneToDelete(zone);
                        setDeleteZoneConfirmOpen(true);
                      }}
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

      {/* ── CONTEÚDO TAB 2: BAIRROS MAPEADOS ─────────────────────────────── */}
      {activeTab === "neighborhoods" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar bairro de Feira de Santana..."
                  value={neighborhoodSearch}
                  onChange={(e) => setNeighborhoodSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <select
                value={neighborhoodZoneFilter}
                onChange={(e) => setNeighborhoodZoneFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="">Todas as Zonas</option>
                <option value="1">Zona 1 (R$ 10,00)</option>
                <option value="2">Zona 2 (R$ 12,00)</option>
                <option value="3">Zona 3 (R$ 15,00)</option>
                <option value="4">Zona 4 (R$ 18,00)</option>
                <option value="rural">Área Rural (Bloqueado)</option>
              </select>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setEditingNeighborhood(null);
                setNeighborhoodForm({ name: "", zoneOrder: "1", outOfArea: false });
                setNeighborhoodModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Bairro
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Bairro Canônico</th>
                    <th className="py-3 px-4">Chave Normalizada</th>
                    <th className="py-3 px-4">Zona Atribuída</th>
                    <th className="py-3 px-4">Status / Cobertura</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredNeighborhoods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum bairro encontrado com os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    filteredNeighborhoods.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {item.normalizedKey}
                        </td>
                        <td className="py-3 px-4">
                          {item.outOfArea ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              Fora da Área (Rural)
                            </span>
                          ) : item.zoneOrder ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              Zona {item.zoneOrder}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Não definida</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {item.outOfArea ? (
                            <span className="text-red-600 font-medium text-[11px]">Entrega rápida bloqueada</span>
                          ) : (
                            <span className="text-emerald-600 font-medium text-[11px]">Atendido por Motoboy</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditNeighborhood(item)}
                            className="h-7 text-xs gap-1"
                          >
                            <Edit2 className="h-3 w-3" /> Alterar
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO TAB 3: CEPS & REGIÕES (CACHE) ───────────────────────── */}
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
              variant="default"
              size="sm"
              onClick={() => {
                setZipForm({
                  zipCode: "",
                  district: "",
                  city: "Feira de Santana",
                  state: "BA",
                  zoneId: "",
                });
                setZipModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Cadastrar CEP
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
                    <th className="py-3 px-4">Zona Atribuída</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Confiança</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {zipCodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum CEP encontrado no cache para os filtros selecionados.
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
                        <td className="py-3 px-4">
                          {item.zone ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-semibold text-[11px] bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                              {item.zone.name} ({formatPrice(item.zone.price)})
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">Resolvido por Bairro</span>
                          )}
                        </td>
                        <td className="py-3 px-4">{renderSourceBadge(item.source)}</td>
                        <td className="py-3 px-4">{renderConfidenceBadge(item.confidence)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setZipToDelete({ id: item.id, zipCode: item.zipCode });
                              setDeleteZipConfirmOpen(true);
                            }}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                            title="Remover do Cache"
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
                  Página {page} de {totalPages} ({totalZipCodes} no total)
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

      {/* ── CONTEÚDO TAB 4: CEPS PENDENTES / AUDITORIA ────────────────────── */}
      {activeTab === "unresolved" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Estes CEPs foram consultados por clientes no checkout mas não puderam ser resolvidos deterministicamente (dispararam seleção manual). Mapeie o bairro ou crie um override para acelerar futuras cotações.
            </p>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CEP</th>
                    <th className="py-3 px-4">Bairro Informado</th>
                    <th className="py-3 px-4">Cotações (Hits)</th>
                    <th className="py-3 px-4">Motivo do Fallback</th>
                    <th className="py-3 px-4">Última Tentativa</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {unresolvedZips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum CEP pendente de mapeamento no momento. Excelente cobertura!
                      </td>
                    </tr>
                  ) : (
                    unresolvedZips.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {formatZipCode(item.zipCode)}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {item.district || <span className="text-muted-foreground italic">Não identificado</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {item.hitCount}x
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                          {item.reason}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(item.updatedAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setOverrideForm({
                                zipCode: item.zipCode,
                                district: item.district || "",
                                zoneOrder: "1",
                                note: "Criado a partir da auditoria de CEPs pendentes",
                              });
                              setOverrideModalOpen(true);
                            }}
                            className="h-7 text-xs"
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Criar Override
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUnresolved(item.id)}
                            className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO TAB 5: OVERRIDES MANUAIS ─────────────────────────────── */}
      {activeTab === "overrides" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Overrides manuais têm prioridade máxima (Passo 1 da cascata). O CEP indicado sempre resolverá para a zona configurada aqui.
            </p>

            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setOverrideForm({ zipCode: "", district: "", zoneOrder: "1", note: "" });
                setOverrideModalOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Override
            </Button>
          </div>

          <div className="border rounded-xl bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/80 text-muted-foreground font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CEP</th>
                    <th className="py-3 px-4">Bairro</th>
                    <th className="py-3 px-4">Zona Fixa</th>
                    <th className="py-3 px-4">Observação / Motivo</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {overrides.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum override manual cadastrado.
                      </td>
                    </tr>
                  ) : (
                    overrides.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {formatZipCode(item.zipCode)}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">{item.district}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                            Zona {item.zoneOrder}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{item.note || "—"}</td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteOverride(item.id)}
                            className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CRIAR / EDITAR ZONA ───────────────────────────────────── */}
      <Dialog open={zoneModalOpen} onOpenChange={setZoneModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Editar Zona de Entrega" : "Nova Zona de Entrega"}</DialogTitle>
            <DialogDescription>
              Defina os limites nominais em km e o preço cobrado no checkout.
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
              <Button type="submit" variant="default" disabled={zoneSubmitting}>
                {zoneSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {editingZone ? "Salvar Alterações" : "Criar Zona"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: EDITAR / CADASTRAR BAIRRO ──────────────────────────────── */}
      <Dialog open={neighborhoodModalOpen} onOpenChange={setNeighborhoodModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingNeighborhood ? `Editar Bairro: ${editingNeighborhood.name}` : "Novo Bairro Canônico"}
            </DialogTitle>
            <DialogDescription>
              Defina a qual zona de entrega este bairro pertence ou se é área rural bloqueada.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveNeighborhood} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="nb-name" className="text-xs">
                Nome do Bairro <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nb-name"
                placeholder="Ex: Kalilândia"
                value={neighborhoodForm.name}
                onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, name: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="nb-rural"
                type="checkbox"
                checked={neighborhoodForm.outOfArea}
                onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, outOfArea: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <Label htmlFor="nb-rural" className="text-xs font-semibold cursor-pointer text-red-600">
                Marcar como Distrito Rural / Fora da Área (Bloqueia entrega rápida)
              </Label>
            </div>

            {!neighborhoodForm.outOfArea && (
              <div>
                <Label htmlFor="nb-zone" className="text-xs">
                  Zona de Entrega
                </Label>
                <select
                  id="nb-zone"
                  value={neighborhoodForm.zoneOrder}
                  onChange={(e) => setNeighborhoodForm({ ...neighborhoodForm, zoneOrder: e.target.value })}
                  className="w-full mt-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
                >
                  <option value="1">Zona 1 (Até 3 km - R$ 10,00)</option>
                  <option value="2">Zona 2 (3 a 6 km - R$ 12,00)</option>
                  <option value="3">Zona 3 (6 a 10 km - R$ 15,00)</option>
                  <option value="4">Zona 4 (10 a 12 km - R$ 18,00)</option>
                </select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setNeighborhoodModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="default" disabled={neighborhoodSubmitting}>
                {neighborhoodSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar Bairro
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CADASTRAR CEP INDIVIDUAL ───────────────────────────────── */}
      <Dialog open={zipModalOpen} onOpenChange={setZipModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar CEP no Cache</DialogTitle>
            <DialogDescription>
              Adicione um CEP de Feira de Santana associado a um bairro para resolução imediata.
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

            <div>
              <Label htmlFor="zip-zone" className="text-xs">
                Zona de Entrega Fixa (Opcional)
              </Label>
              <select
                id="zip-zone"
                value={zipForm.zoneId}
                onChange={(e) => setZipForm({ ...zipForm, zoneId: e.target.value })}
                className="w-full mt-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="">Automática (resolvida por Bairro / Prefixo)</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} - {formatPrice(z.price)}
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setZipModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="default" disabled={zipSubmitting}>
                {zipSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar CEP
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: OVERRIDE MANUAL ────────────────────────────────────────── */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Override de CEP</DialogTitle>
            <DialogDescription>
              Fixa uma zona para um CEP específico, com prioridade máxima sobre qualquer outra regra.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveOverride} className="space-y-4 pt-2">
            <div>
              <Label htmlFor="or-zip" className="text-xs">
                CEP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="or-zip"
                placeholder="44000-000"
                value={overrideForm.zipCode}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setOverrideForm({ ...overrideForm, zipCode: digits });
                }}
                className="mt-1 font-mono tracking-wider"
                required
              />
            </div>

            <div>
              <Label htmlFor="or-dist" className="text-xs">
                Bairro / Localidade <span className="text-red-500">*</span>
              </Label>
              <Input
                id="or-dist"
                placeholder="Ex: Papagaio"
                value={overrideForm.district}
                onChange={(e) => setOverrideForm({ ...overrideForm, district: e.target.value })}
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="or-zone" className="text-xs">
                Zona Forçada
              </Label>
              <select
                id="or-zone"
                value={overrideForm.zoneOrder}
                onChange={(e) => setOverrideForm({ ...overrideForm, zoneOrder: e.target.value })}
                className="w-full mt-1 h-9 px-3 text-xs rounded-md border border-input bg-background"
              >
                <option value="1">Zona 1 (R$ 10,00)</option>
                <option value="2">Zona 2 (R$ 12,00)</option>
                <option value="3">Zona 3 (R$ 15,00)</option>
                <option value="4">Zona 4 (R$ 18,00)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="or-note" className="text-xs">
                Motivo / Observação
              </Label>
              <Input
                id="or-note"
                placeholder="Ex: Acordo especial / Endereço limítrofe"
                value={overrideForm.note}
                onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOverrideModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="default" disabled={overrideSubmitting}>
                {overrideSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Salvar Override
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
              <p>CEP,Bairro,Cidade,Estado</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Exemplo: 44002000,Kalilândia,Feira de Santana,BA
              </p>
            </div>

            <textarea
              rows={8}
              placeholder="44002000,Kalilândia,Feira de Santana,BA&#10;44050000,Cidade Nova,Feira de Santana,BA"
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
                variant="default"
                onClick={handleBulkImport}
                disabled={bulkSubmitting || !bulkCsvText.trim()}
              >
                {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Importar Lista
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE CEP ──────────────────────────────── */}
      <Dialog open={deleteZipConfirmOpen} onOpenChange={setDeleteZipConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover CEP do Cache</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o CEP{" "}
              <span className="font-mono font-bold text-foreground">
                {zipToDelete ? formatZipCode(zipToDelete.zipCode) : ""}
              </span>{" "}
              do cache? Ele será resolvido novamente na próxima consulta.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteZipConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteZipCode}>
              <Trash2 className="h-4 w-4 mr-1" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO DE ZONA ─────────────────────────────── */}
      <Dialog open={deleteZoneConfirmOpen} onOpenChange={setDeleteZoneConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Zona de Entrega</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir{" "}
              <span className="font-bold text-foreground">
                {zoneToDelete?.name}
              </span>?
              Os endereços pertencentes a esta zona não terão mais entrega disponível no checkout.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteZoneConfirmOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteZone}>
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir Zona
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
