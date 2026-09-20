import { useCallback, useEffect, useState } from "react";
import { futureWakeTimes } from "./flow";
import {
  alertsAvailableHere,
  alertsCaption,
  alertsSupported,
  loadAlertsEnabled,
  registerSlipWorker,
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
  const wakes = futureWakeTimes(Object.values(cards));
  const wakeKey = wakes.join(",");

  useEffect(() => {
    if (!enabled) return;
    void syncPushSubscription(wakes).catch(() => {
      /* keep local flag; next open retries */
    });
    // wakeKey is the stable serial of `wakes`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, wakeKey]);

  const enable = useCallback(async () => {
    if (!alertsAvailableHere()) {
      setStatus(alertsSupported() ? "need-home" : "blocked");
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
      const nextWakes = futureWakeTimes(Object.values(cards));
      saveAlertsEnabled(true);
      setStatus("on");
      const reg = await registerSlipWorker();
      await syncPushSubscription(nextWakes);
      await reg.showNotification("Slip", {
        body: nextWakes.length
          ? "We'll ping after 8:00 if that card is still here."
          : "Turn on Morning on a card, and we'll ping after 8:00.",
        tag: "slip-nudge-on",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
      });
    } catch {
      saveAlertsEnabled(false);
      setStatus(alertsSupported() ? "need-home" : "blocked");
    }
  }, [cards]);

  const disable = useCallback(async () => {
    saveAlertsEnabled(false);
    setStatus("off");
    try {
      await syncPushSubscription([]);
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
