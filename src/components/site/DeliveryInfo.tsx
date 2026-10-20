import { Clock3, Truck } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DeliveryInfoProps {
    /**
     * "full"   → banner horizontal completo (home, seções)
     * "inline" → versão compacta para dentro do card de produto
     */
    variant?: "full" | "inline";
    className?: string;
}

export const deliverySchedule = [
    { label: 'Segunda a sexta', opens: 8, closes: 17 },
    { label: 'Sábado', opens: 8, closes: 13 },
    { label: 'Domingo', opens: null, closes: null },
] as const;

/* ──────────────────────────────────────────── */
/*  Variante FULL (home, seções)                */
/* ──────────────────────────────────────────── */
function DeliveryInfoFull({ className }: { className?: string }) {
    return (
        <section aria-label="Horários do delivery" className={cn("border-y border-border bg-white py-5 mt-10", className)}>
            <div className="container-page flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <Truck className="size-8 shrink-0 text-primary" />
                    <div>
                        <h2 className="text-base font-bold">Delivery em Feira de Santana</h2>
                        <p className="mt-1 text-xs text-muted-foreground">Entregas somente no horário comercial</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:gap-6">
                    {deliverySchedule.map(day => (
                        <div key={day.label} className="border-l border-border pl-3 sm:pl-5">
                            <p className="text-xs text-muted-foreground">{day.label}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-sm font-bold sm:text-base">
                                {day.opens === null
                                    ? 'Fechado'
                                    : <><Clock3 className="hidden size-4 shrink-0 text-primary sm:block" />{day.opens}h às {day.closes}h</>
                                }
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ──────────────────────────────────────────── */
/*  Variante INLINE (card de produto)           */
/* ──────────────────────────────────────────── */
function DeliveryInfoInline({ className }: { className?: string }) {
    return (
        <div
            aria-label="Horários do delivery"
            className={cn("w-full mt-3 pt-3 border-t border-emerald-500/20 flex flex-col gap-3", className)}
        >
            <div className="flex items-center gap-2">
                <div className="flex items-start gap-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
                        <Truck className="size-5" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div>
                            <h4 className="text-sm font-bold text-foreground">Horário do Delivery</h4>
                            <p className="text-[11px] text-muted-foreground">Entregas somente no horário comercial</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {deliverySchedule.map(day => (
                                <div key={day.label} className="border-l border-border/60">
                                    <p className="text-[10px] text-muted-foreground">{day.label}</p>
                                    <p className="mt-0.5 flex items-center gap-1 text-xs font-bold">
                                        {day.opens === null
                                            ? 'Fechado'
                                            : <><Clock3 className="size-3 shrink-0 text-primary" />{day.opens}h às {day.closes}h</>
                                        }
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}

/* ──────────────────────────────────────────── */
/*  Export principal                            */
/* ──────────────────────────────────────────── */
export function DeliveryInfo({ variant = "full", className }: DeliveryInfoProps) {
    if (variant === "inline") {
        return <DeliveryInfoInline className={className} />;
    }
    return <DeliveryInfoFull className={className} />;
}
