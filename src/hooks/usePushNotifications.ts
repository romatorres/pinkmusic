"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { isPushNotificationSupported, requestFCMToken } from "@/lib/firebase/client";

export type PushPermissionStatus =
  | "default"
  | "granted"
  | "denied"
  | "unsupported"
  | "ios_needs_pwa";

export interface PushDevice {
  id: string;
  deviceName: string | null;
  userAgent: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WindowWithMSStream extends Window {
  MSStream?: unknown;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushPermissionStatus>("default");
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [devices, setDevices] = useState<PushDevice[]>([]);

  // Detecta se é iOS e se não está no modo PWA standalone
  const checkIsIosNeedsPwa = useCallback(() => {
    if (typeof window === "undefined") return false;
    const win = window as WindowWithMSStream;
    const nav = window.navigator as NavigatorWithStandalone;
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream;
    const isStandalone =
      nav.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;

    return isIos && !isStandalone;
  }, []);

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch("/api/push/devices");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setDevices(json.data || []);
        }
      }
    } catch (err) {
      console.warn("Falha ao carregar dispositivos de push:", err);
    }
  }, []);

  // Inicialização e checagem de suporte
  useEffect(() => {
    let isMounted = true;

    async function checkSupport() {
      if (checkIsIosNeedsPwa()) {
        if (isMounted) {
          setIsSupported(false);
          setStatus("ios_needs_pwa");
          setLoading(false);
        }
        return;
      }

      const supported = await isPushNotificationSupported();
      if (!isMounted) return;

      setIsSupported(supported);

      if (!supported) {
        setStatus("unsupported");
      } else if (typeof window !== "undefined" && "Notification" in window) {
        setStatus(Notification.permission as PushPermissionStatus);
      }

      setLoading(false);
      loadDevices();
    }

    checkSupport();

    return () => {
      isMounted = false;
    };
  }, [checkIsIosNeedsPwa, loadDevices]);

  // Ativar notificações neste dispositivo
  const subscribe = async () => {
    setActionLoading(true);
    try {
      if (checkIsIosNeedsPwa()) {
        toast.info("No iPhone, adicione este site à Tela de Início primeiro", {
          description: "Toque no ícone Compartilhar do Safari e escolha 'Adicionar à Tela de Início'.",
        });
        return;
      }

      const token = await requestFCMToken();
      if (!token) {
        throw new Error("Não foi possível gerar o token de notificação.");
      }

      setCurrentToken(token);

      const deviceName =
        typeof navigator !== "undefined"
          ? `${navigator.platform || "Aparelho"} (${navigator.userAgent.includes("Mobile") ? "Celular" : "Desktop"})`
          : "Dispositivo";

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          deviceName,
          userAgent: navigator.userAgent,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao registrar token no servidor.");
      }

      setStatus("granted");
      toast.success("Notificações push ativadas com sucesso!", {
        description: "Você será avisado sempre que uma venda for confirmada.",
      });

      loadDevices();
    } catch (err: unknown) {
      console.error("Erro ao ativar push:", err);
      const msg = err instanceof Error ? err.message : "Falha ao ativar notificações.";
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
        setStatus("denied");
        toast.error("Notificações bloqueadas no navegador", {
          description: "Acesse as configurações do seu navegador para permitir as notificações.",
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Desativar notificações deste dispositivo
  const unsubscribe = async () => {
    if (!currentToken) {
      toast.error("Nenhum token ativo identificado nesta sessão para desativar.");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: currentToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao desativar notificações.");
      }

      toast.info("Notificações desativadas para este aparelho.");
      loadDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao desativar notificações.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Disparar teste
  const sendTest = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erro ao disparar teste.");
      }

      toast.success("Notificação de teste enviada!", {
        description: `Disparada para ${data.sentCount} aparelho(s) cadastrado(s).`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao enviar notificação de teste.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return {
    status,
    isSupported,
    loading,
    actionLoading,
    devices,
    subscribe,
    unsubscribe,
    sendTest,
    reloadDevices: loadDevices,
  };
}
