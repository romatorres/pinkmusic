"use client";

import React from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Button } from "@/components/ui/button";
import {
  Bell,
  BellOff,
  BellRing,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  Info,
  Loader2,
  Send,
  Share,
} from "lucide-react";

export function PushNotificationSettings() {
  const {
    status,
    loading,
    actionLoading,
    devices,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  return (
    <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500 dark:text-pink-400">
              <BellRing className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Notificações de Vendas (Push)
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Receba alertas sonoros e instantâneos em tempo real no seu celular ou computador sempre que um novo pagamento for confirmado.
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Verificando suporte...
            </div>
          ) : status === "granted" ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Notificações Ativadas
            </div>
          ) : status === "denied" ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-full">
              <AlertTriangle className="h-3.5 w-3.5" />
              Bloqueadas no Navegador
            </div>
          ) : status === "ios_needs_pwa" ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              <Info className="h-3.5 w-3.5" />
              Requer Instalação no iOS
            </div>
          ) : status === "unsupported" ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <BellOff className="h-3.5 w-3.5" />
              Não Suportado
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Bell className="h-3.5 w-3.5" />
              Desativadas
            </div>
          )}
        </div>
      </div>

      {/* Orientações para iPhone */}
      {status === "ios_needs_pwa" && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 text-sm space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Share className="h-4 w-4" />
            Como ativar no iPhone (iOS 16.4 ou superior):
          </div>
          <ol className="list-decimal list-inside space-y-1 text-xs opacity-90 pl-1">
            <li>Abra este painel no <strong>Safari</strong> do iPhone.</li>
            <li>Toque no botão de <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).</li>
            <li>Role para baixo e selecione <strong>&quot;Adicionar à Tela de Início&quot;</strong>.</li>
            <li>Abra o aplicativo Pink Music pelo ícone na Tela de Início e volte aqui para autorizar o push.</li>
          </ol>
        </div>
      )}

      {/* Orientações se estiver bloqueado */}
      {status === "denied" && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">As notificações estão bloqueadas neste navegador.</p>
            <p className="text-xs opacity-90">
              Para reativar, clique no ícone de cadeado ou configurações ao lado da barra de endereço do seu navegador, altere a permissão de Notificações para &quot;Permitir&quot; e recarregue a página.
            </p>
          </div>
        </div>
      )}

      {/* Ações principais */}
      <div className="flex flex-wrap items-center gap-3">
        {status !== "granted" ? (
          <Button
            onClick={subscribe}
            disabled={actionLoading || loading || status === "unsupported"}
            className="bg-pink-600 hover:bg-pink-700 text-white font-medium shadow-sm transition-all"
          >
            {actionLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ativando...
              </>
            ) : (
              <>
                <BellRing className="mr-2 h-4 w-4" />
                Ativar Notificações neste Aparelho
              </>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={sendTest}
              disabled={actionLoading}
              variant="outline"
              className="border-pink-500/30 text-pink-500 hover:bg-pink-500/10 font-medium"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Testar Notificação Agora
                </>
              )}
            </Button>

            <Button
              onClick={unsubscribe}
              disabled={actionLoading}
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
            >
              <BellOff className="mr-2 h-4 w-4" />
              Desativar neste Aparelho
            </Button>
          </>
        )}
      </div>

      {/* Lista de Dispositivos Cadastrados */}
      <div className="pt-4 border-t border-border/40 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Dispositivos Cadastrados ({devices.length})
          </h3>
        </div>

        {devices.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 italic">
            Nenhum aparelho cadastrado ainda. Clique no botão acima para registrar este dispositivo.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {devices.map((device) => {
              const isMobile =
                device.userAgent?.toLowerCase().includes("mobile") ||
                device.userAgent?.toLowerCase().includes("android") ||
                device.userAgent?.toLowerCase().includes("iphone");

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-muted text-foreground shrink-0">
                      {isMobile ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Laptop className="h-4 w-4" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-foreground truncate">
                        {device.deviceName || (isMobile ? "Celular" : "Computador")}
                      </p>
                      <p className="text-muted-foreground text-[11px] truncate">
                        Cadastrado em {new Date(device.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      device.enabled
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {device.enabled ? "Ativo" : "Inativo"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
