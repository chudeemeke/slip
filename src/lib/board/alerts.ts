const ALERTS_KEY = "slip:alerts";
const SW_URL = "/slip-sw.js";

export type AlertsStatus = "off" | "on" | "need-home" | "blocked" | "busy";

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

export function alertsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function loadAlertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ALERTS_KEY) === "on";
  } catch {
    return false;
  }
}

export function saveAlertsEnabled(on: boolean): void {
  try {
    window.localStorage.setItem(ALERTS_KEY, on ? "on" : "off");
  } catch {
    /* quota */
  }
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerSlipWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

export async function syncPushSubscription(wakeAt: number | null): Promise<void> {
  if (!alertsSupported()) return;
  const reg = await registerSlipWorker();
  if (wakeAt == null) {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      const endpoint = existing.endpoint;
      try {
        await existing.unsubscribe();
      } catch {
        /* already gone */
      }
      await fetch("/api/push", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "unsubscribe", endpoint }),
      });
    }
    return;
  }

  const vapidRes = await fetch("/api/push");
  if (!vapidRes.ok) throw new Error("vapid");
  const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
  if (!publicKey) throw new Error("vapid");

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!p256dh || !auth) throw new Error("keys");
  await fetch("/api/push", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      op: "subscribe",
      endpoint: sub.endpoint,
      p256dh,
      auth,
      wakeAt,
    }),
  });
}

export function alertsCaption(status: AlertsStatus): string {
  switch (status) {
    case "on":
      return "We'll ping after 8:00 if a morning card is still here. Titles stay on this phone.";
    case "need-home":
      return "iPhone only delivers these from the Home Screen app, not from Safari. Share → Add to Home Screen, then open Slip from there.";
    case "blocked":
      return "Alerts are turned off for Slip in Settings.";
    case "busy":
      return "Turning alerts on…";
    default:
      return "Ping after 8:00 if a morning card hasn't moved. Add Slip to your Home Screen first.";
  }
}
