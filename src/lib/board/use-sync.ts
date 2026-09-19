import { useCallback, useEffect, useRef, useState } from "react";
import { useP2PRoom, type PeerInfo } from "@/lib/multiplayer";
import { clearOutbox, enqueueOutbox, loadOutbox } from "./outbox";
import { presenceRows, type PresenceRow } from "./presence";
import { parsePeerMsg } from "./schema";
import { useBoardStore } from "./store";
import { shouldOfferSnapshot } from "./sync-policy";
import type { Card, Identity, PeerMsg } from "./types";

export function useBoardSync(room: string, identity: Identity) {
  const p2p = useP2PRoom({ room: `slip-${room}`, name: identity.name });
  const applyRemoteCards = useBoardStore((s) => s.applyRemoteCards);
  const applyRemoteCard = useBoardStore((s) => s.applyRemoteCard);
  const connectedRef = useRef<string[]>([]);
  const hellosRef = useRef<Record<string, Identity>>({});
  const [hellos, setHellos] = useState<Record<string, Identity>>({});
  const [pending, setPending] = useState(() => loadOutbox(room).length);

  const flush = useCallback(() => {
    const live = p2p.peers.filter((p) => p.connectionState === "connected");
    if (live.length === 0) return false;
    const queued = loadOutbox(room);
    if (queued.length === 0) {
      setPending(0);
      return true;
    }
    for (const card of queued) {
      p2p.send({ t: "put", card } satisfies PeerMsg);
    }
    clearOutbox(room);
    setPending(0);
    return true;
  }, [p2p.peers, p2p.send, room]);

  useEffect(
    () =>
      p2p.onMessage((_from, data, channel) => {
        if (channel !== "reliable") return;
        const msg = parsePeerMsg(data);
        if (!msg) return;
        if (msg.t === "snap") applyRemoteCards(msg.cards);
        else if (msg.t === "put") applyRemoteCard(msg.card);
        else if (msg.t === "hello") {
          hellosRef.current = { ...hellosRef.current, [_from]: msg.identity };
          setHellos(hellosRef.current);
        }
      }),
    [p2p.onMessage, applyRemoteCards, applyRemoteCard],
  );

  useEffect(() => {
    if (!p2p.joined) return;
    p2p.send({ t: "hello", identity } satisfies PeerMsg);
  }, [p2p.joined, p2p.send, identity]);

  useEffect(() => {
    const connected = p2p.peers.filter((p) => p.connectionState === "connected");
    const ids = connected.map((p) => p.id);
    const newcomers = connected.filter((p) => !connectedRef.current.includes(p.id));
    if (newcomers.length > 0) {
      const incumbents = connectedRef.current;
      const localCards = useBoardStore.getState().cards;
      if (shouldOfferSnapshot(p2p.selfId, incumbents, Object.keys(localCards).length)) {
        const cards = Object.values(localCards);
        for (const peer of newcomers) {
          p2p.send({ t: "snap", cards } satisfies PeerMsg, peer.id);
          p2p.send({ t: "hello", identity } satisfies PeerMsg, peer.id);
        }
      }
      flush();
    }
    connectedRef.current = ids;
  }, [p2p.peers, p2p.selfId, p2p.send, identity, flush]);

  const publish = useCallback(
    (card: Card) => {
      enqueueOutbox(room, card);
      if (!flush()) setPending(loadOutbox(room).length);
    },
    [flush, room],
  );

  const rows: PresenceRow[] = presenceRows(identity, p2p.peers, hellos);

  return { p2p, publish, pending, rows };
}

export function livePeers(peers: PeerInfo[]) {
  return peers.filter((p) => p.connectionState === "connected");
}
