import type { PeerInfo } from "@/lib/multiplayer";
import type { Identity } from "./types";

export type PresenceRow = {
  key: string;
  name: string;
  you?: boolean;
  status: string;
  rtt?: number | null;
};

/**
 * Collapse mesh sessions onto stable identity ids (from hello messages)
 * so a remount does not look like a second person.
 */
export function presenceRows(
  self: Identity,
  peers: PeerInfo[],
  hellos: Record<string, Identity>,
): PresenceRow[] {
  const rows = new Map<string, PresenceRow>();
  rows.set(self.id, {
    key: self.id,
    name: self.name,
    you: true,
    status: "connected",
  });

  for (const peer of peers) {
    const ident = hellos[peer.id];
    const key = ident?.id ?? `peer:${peer.id}`;
    const name = ident?.name || peer.name || "Guest";
    const live = peer.connectionState === "connected";
    const existing = rows.get(key);

    if (key === self.id) {
      if (existing && live) existing.status = "connected";
      continue;
    }

    if (!existing) {
      rows.set(key, {
        key,
        name,
        status: peer.connectionState,
        rtt: peer.rttMs,
      });
      continue;
    }

    if (live) {
      existing.status = "connected";
      existing.name = name;
      existing.rtt = peer.rttMs ?? existing.rtt;
    } else if (existing.status !== "connected") {
      existing.status = peer.connectionState;
      existing.rtt = peer.rttMs ?? existing.rtt;
    }
  }

  return [...rows.values()];
}
