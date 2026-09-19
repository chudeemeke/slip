import { useCallback, useEffect, useRef } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { useBoardStore } from "./store";
import type { Card, PeerMsg } from "./types";

function isPeerMsg(data: unknown): data is PeerMsg {
  if (!data || typeof data !== "object") return false;
  const t = (data as { t?: unknown }).t;
  return t === "snap" || t === "put";
}

export function useBoardSync(room: string, name: string) {
  const p2p = useP2PRoom({ room: `slip-${room}`, name });
  const applyRemoteCards = useBoardStore((s) => s.applyRemoteCards);
  const applyRemoteCard = useBoardStore((s) => s.applyRemoteCard);
  const connectedRef = useRef<string[]>([]);

  useEffect(
    () =>
      p2p.onMessage((_from, data, channel) => {
        if (channel !== "reliable") return;
        if (!isPeerMsg(data)) return;
        if (data.t === "snap" && Array.isArray(data.cards)) {
          applyRemoteCards(data.cards);
        } else if (data.t === "put" && data.card && typeof data.card === "object") {
          applyRemoteCard(data.card);
        }
      }),
    [p2p.onMessage, applyRemoteCards, applyRemoteCard],
  );

  useEffect(() => {
    const connected = p2p.peers.filter((p) => p.connectionState === "connected");
    const ids = connected.map((p) => p.id);
    const newcomers = connected.filter((p) => !connectedRef.current.includes(p.id));
    for (const peer of newcomers) {
      const incumbents = [p2p.selfId, ...connectedRef.current];
      const host = [...incumbents].sort()[0];
      if (host === p2p.selfId) {
        const cards = Object.values(useBoardStore.getState().cards);
        p2p.send({ t: "snap", cards } satisfies PeerMsg, peer.id);
      }
    }
    connectedRef.current = ids;
  }, [p2p.peers, p2p.selfId, p2p.send]);

  const publish = useCallback(
    (card: Card) => {
      p2p.send({ t: "put", card } satisfies PeerMsg);
    },
    [p2p.send],
  );

  return { p2p, publish };
}

export function livePeers(peers: PeerInfo[]) {
  return peers.filter((p) => p.connectionState === "connected");
}
