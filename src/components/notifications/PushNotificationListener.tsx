"use client";

import { useEffect } from "react";
import { getFirebaseClientApp } from "@/lib/firebase/client";
import { getMessaging, onMessage, isSupported } from "firebase/messaging";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

interface PushPayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: {
    url?: string;
    orderId?: string;
  };
}

export function PushNotificationListener() {
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      if (typeof window === "undefined") return;

      const supported = await isSupported().catch(() => false);
      if (!supported) return;

      const app = getFirebaseClientApp();
      if (!app) return;

      try {
        const messaging = getMessaging(app);

        unsubscribe = onMessage(messaging, (rawPayload: Record<string, unknown>) => {
          const payload = rawPayload as unknown as PushPayload;
          const title = payload.notification?.title || "🛒 Nova venda confirmada!";
          const body = payload.notification?.body || "Um pagamento foi aprovado.";
          const orderUrl = payload.data?.url || "/dashboard/orders";

          toast(title, {
            description: body,
            icon: <ShoppingCart className="h-5 w-5 text-emerald-500" />,
            duration: 8000,
            action: {
              label: "Ver Pedido",
              onClick: () => router.push(orderUrl),
            },
          });
        });
      } catch (err) {
        console.warn("[FCM Foreground] Falha ao registrar onMessage:", err);
      }
    }

    setupListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  return null;
}
