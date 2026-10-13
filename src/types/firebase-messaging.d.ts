declare module "firebase/messaging" {
  import { FirebaseApp } from "firebase/app";

  export interface Messaging {
    app: FirebaseApp;
  }

  export interface GetTokenOptions {
    vapidKey?: string;
    serviceWorkerRegistration?: ServiceWorkerRegistration;
  }

  export function getMessaging(app?: FirebaseApp): Messaging;
  export function isSupported(): Promise<boolean>;
  export function getToken(
    messaging: Messaging,
    options?: GetTokenOptions
  ): Promise<string>;
  export function onMessage(
    messaging: Messaging,
    nextOrObserver: (payload: Record<string, unknown>) => void
  ): () => void;
}
