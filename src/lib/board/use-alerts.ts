import { useCallback, useEffect, useState } from "react";
import { nextWakeAt } from "./flow";
import {
  alertsCaption,
  alertsSupported,
  isStandalone,
  loadAlertsEnabled,
  saveAlertsEnabled,
  syncPushSubscription,
  type AlertsStatus,
} from "./alerts";
import type { Card } from "./types";

export function useMorningAlerts(cards: Record<string, Card>) {
  const [status, setStatus] = useState<AlertsStatus>(() =>
    loadAlertsEnabled() ? "on" : "off",
  );
  const enabled = status === "on";
  const wakeAt = nextWakeAt(Object.values(cards));

  useEffect(() => {
    if (!enabled) return;
    void syncPushSubscription(wakeAt).catch(() => {
      /* keep local flag; next open retries */
    });
  }, [enabled, wakeAt]);

  const enable = useCallback(async () => {
    if (!isStandalone() || !alertsSupported()) {
      setStatus("need-home");
      return;
    }
    setStatus("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        saveAlertsEnabled(false);
        setStatus("blocked");
        return;
      }
      saveAlertsEnabled(true);
      setStatus("on");
      await syncPushSubscription(nextWakeAt(Object.values(cards)));
    } catch {
      saveAlertsEnabled(false);
      setStatus("need-home");
    }
  }, [cards]);

  const disable = useCallback(async () => {
    saveAlertsEnabled(false);
    setStatus("off");
    try {
      await syncPushSubscription(null);
    } catch {
      /* local off is enough */
    }
  }, []);

  return {
    status,
    enabled,
    caption: alertsCaption(status),
    enable,
    disable,
  };
}
