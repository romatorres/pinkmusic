"use client";

import { Search, Clock, Tag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Category } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const MAX_RECENT = 5;
const RECENT_KEY = "pm.recent_search";

function readRecent(): string[] {
  try {
    const v = localStorage.getItem(RECENT_KEY);
    return v ? (JSON.parse(v) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecent(terms: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(terms));
  } catch {}
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <div className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted transition-colors"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function HeaderSearchBox({
  className,
  initialValue = "",
  onSearch,
  autoFocus,
}: {
  className?: string;
  initialValue?: string;
  onSearch?: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Sync valor externo (ex: ao navegar de volta com search param)
  useEffect(() => {
    setQ(initialValue);
  }, [initialValue]);

  // Carrega histórico e categorias
  useEffect(() => {
    setRecent(readRecent());

    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success) setCategories(data.data || []);
      })
      .catch(() => {});
  }, []);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pushRecent = (term: string) => {
    const updated = [
      term,
      ...recent.filter((x) => x.toLowerCase() !== term.toLowerCase()),
    ].slice(0, MAX_RECENT);
    setRecent(updated);
    saveRecent(updated);
  };

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    pushRecent(t);
    setOpen(false);
    if (onSearch) {
      onSearch(t);
    } else {
      router.push(`/products-all?search=${encodeURIComponent(t)}`);
    }
  };

  // Filtra subcategorias que batem com a busca
  const rootCategories = categories.filter((c) => !c.parentId);
  const matchedSubs = q.trim()
    ? rootCategories.flatMap((cat) =>
        (cat.subcategories ?? [])
          .filter((sub) => norm(sub.name).includes(norm(q)))
          .map((sub) => ({ cat, sub }))
      ).slice(0, 5)
    : [];

  // Categorias raiz para atalhos (quando campo vazio)
  const topCategories = rootCategories.slice(0, 7);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        role="search"
      >
        <label className="sr-only" htmlFor="header-busca">
          Buscar produtos
        </label>
        <div className="flex h-12 items-center gap-2 rounded-xl border-2 border-transparent bg-card px-4 shadow-card transition-all focus-within:border-primary">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            id="header-busca"
            autoFocus={autoFocus}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="O que você está procurando?"
            autoComplete="off"
            className="h-full flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setQ("")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[70vh] overflow-auto rounded-xl border bg-popover p-2 text-popover-foreground shadow-lift animate-in fade-in-0 slide-in-from-top-1">
          {!q.trim() ? (
            /* ── Estado vazio: recentes + atalhos de categoria ── */
            <>
              {recent.length > 0 && (
                <Group title="Pesquisas recentes">
                  {recent.map((r) => (
                    <Row key={r} onClick={() => go(r)}>
                      <Clock className="size-4 text-muted-foreground shrink-0" />
                      {r}
                    </Row>
                  ))}
                </Group>
              )}

              {topCategories.length > 0 && (
                <Group title="Categorias">
                  <div className="flex flex-wrap gap-2 px-2 pb-2">
                    {topCategories.map((c) => (
                      <Link
                        key={c.id}
                        href={`/products-all?categoryIds=${c.id}`}
                        onClick={() => setOpen(false)}
                        className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/70 transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </Group>
              )}
            </>
          ) : (
            /* ── Estado com query: subcategorias + botão busca ── */
            <>
              {matchedSubs.length > 0 && (
                <Group title="Categorias relacionadas">
                  {matchedSubs.map(({ cat, sub }) => (
                    <Link
                      key={sub.id}
                      href={`/products-all?categoryIds=${sub.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Tag className="size-4 text-primary shrink-0" />
                      <span className="font-medium">{sub.name}</span>
                      <span className="text-muted-foreground">em {cat.name}</span>
                    </Link>
                  ))}
                </Group>
              )}

              <button
                type="button"
                onClick={() => go(q)}
                className="mt-1 w-full rounded-lg bg-secondary px-3 py-2.5 text-left text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Ver todos os resultados para &quot;{q}&quot;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
