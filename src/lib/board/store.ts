import { create } from "zustand";
import { currentTime, hydrateClock, observeTime, tick } from "./clock";
import { entityId, makeRoomCode, parseRoomCode } from "./ids";
import {
  cardsInColumn,
  mergeCard,
  mergeCards,
  needsRebalance,
  pruneCards,
  rankAt,
  rebalanceRanks,
} from "./merge";
import {
  ensureIdentity,
  loadBoard,
  loadClock,
  loadIdentity,
  saveBoard,
  saveClock,
  saveLastRoom,
  sampleCards,
} from "./storage";
import type { Card, ColumnId, Identity } from "./types";

type BoardStore = {
  identity: Identity | null;
  room: string | null;
  cards: Record<string, Card>;
  activeColumn: ColumnId;
  ready: boolean;
  boot: () => void;
  setName: (name: string) => Identity;
  createBoard: () => string;
  joinBoard: (code: string) => string | null;
  leaveBoard: () => void;
  setActiveColumn: (column: ColumnId) => void;
  applyRemoteCards: (incoming: Card[]) => void;
  applyRemoteCard: (incoming: Card) => void;
  upsertCard: (input: {
    id?: string;
    title: string;
    description: string;
    column: ColumnId;
  }) => Card | null;
  deleteCard: (id: string) => Card | null;
  moveCard: (id: string, column: ColumnId, index: number) => Card[];
};

function persist() {
  const { room, cards } = useBoardStore.getState();
  if (!room) return;
  const pruned = saveBoard(room, cards);
  saveClock(currentTime());
  if (pruned !== cards) useBoardStore.setState({ cards: pruned });
}

function stamp(existing: Card, identity: Identity | null): Pick<Card, "authorId" | "authorName" | "updatedAt"> {
  return {
    updatedAt: tick(),
    authorId: identity?.id ?? existing.authorId,
    authorName: identity?.name ?? existing.authorName,
  };
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  identity: null,
  room: null,
  cards: {},
  activeColumn: "todo",
  ready: false,

  boot: () => {
    if (get().ready) return;
    hydrateClock(loadClock());
    set({
      identity: loadIdentity(),
      ready: true,
    });
  },

  setName: (name: string) => {
    const identity = ensureIdentity(name);
    set({ identity });
    return identity;
  },

  createBoard: () => {
    const identity = get().identity ?? ensureIdentity("Guest");
    let room = makeRoomCode();
    for (let i = 0; i < 6; i++) {
      if (Object.keys(loadBoard(room)).length === 0) break;
      room = makeRoomCode();
    }
    const cards = sampleCards(identity.id, identity.name);
    saveLastRoom(room);
    saveBoard(room, cards);
    set({ identity, room, cards, activeColumn: "todo" });
    return room;
  },

  joinBoard: (code: string) => {
    const room = parseRoomCode(code);
    if (!room) return null;
    const identity = get().identity ?? loadIdentity();
    const cards = loadBoard(room);
    const maxTs = Object.values(cards).reduce((m, c) => Math.max(m, c.updatedAt), 0);
    observeTime(maxTs);
    saveLastRoom(room);
    set({ identity, room, cards, activeColumn: "todo" });
    return room;
  },

  leaveBoard: () => {
    persist();
    saveLastRoom(null);
    set({ room: null, cards: {}, activeColumn: "todo" });
  },

  setActiveColumn: (column) => set({ activeColumn: column }),

  applyRemoteCards: (incoming) => {
    if (incoming.length === 0) return;
    let maxTs = 0;
    for (const card of incoming) if (card.updatedAt > maxTs) maxTs = card.updatedAt;
    observeTime(maxTs);
    const merged = mergeCards(get().cards, incoming);
    if (merged === get().cards) return;
    const pruned = pruneCards(merged, currentTime() || Date.now());
    set({ cards: pruned });
    persist();
  },

  applyRemoteCard: (incoming) => {
    observeTime(incoming.updatedAt);
    const current = get().cards[incoming.id];
    const merged = mergeCard(current, incoming);
    if (merged === current) return;
    set({ cards: { ...get().cards, [incoming.id]: merged } });
    persist();
  },

  upsertCard: ({ id, title, description, column }) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;
    const identity = get().identity;
    const existing = id ? get().cards[id] : undefined;
    const list = cardsInColumn(get().cards, column);
    const card: Card = {
      id: existing?.id ?? entityId("c"),
      title: trimmedTitle.slice(0, 200),
      description: description.trim().slice(0, 4000),
      column,
      rank:
        existing && existing.column === column
          ? existing.rank
          : rankAt(list.at(-1)?.rank),
      updatedAt: tick(),
      deleted: false,
      authorId: identity?.id ?? existing?.authorId ?? "local",
      authorName: identity?.name ?? existing?.authorName ?? "Guest",
    };
    set({ cards: { ...get().cards, [card.id]: card } });
    persist();
    return card;
  },

  deleteCard: (id) => {
    const existing = get().cards[id];
    if (!existing) return null;
    const card: Card = {
      ...existing,
      deleted: true,
      ...stamp(existing, get().identity),
    };
    set({ cards: { ...get().cards, [id]: card } });
    persist();
    return card;
  },

  moveCard: (id, column, index) => {
    const existing = get().cards[id];
    if (!existing) return [];
    const identity = get().identity;
    const list = cardsInColumn(get().cards, column).filter((c) => c.id !== id);
    const clamped = Math.max(0, Math.min(index, list.length));
    const before = list[clamped - 1]?.rank;
    const after = list[clamped]?.rank;
    const ordered = [...list.slice(0, clamped), existing, ...list.slice(clamped)];

    if (needsRebalance(before, after)) {
      const ranks = rebalanceRanks(ordered.map((c) => c.id));
      const next = { ...get().cards };
      const touched: Card[] = [];
      for (const item of ordered) {
        const card: Card = {
          ...item,
          column,
          rank: ranks[item.id]!,
          deleted: false,
          ...stamp(item, item.id === id ? identity : { id: item.authorId, name: item.authorName }),
        };
        next[item.id] = card;
        touched.push(card);
      }
      set({ cards: next });
      persist();
      return touched;
    }

    const card: Card = {
      ...existing,
      column,
      rank: rankAt(before, after),
      deleted: false,
      ...stamp(existing, identity),
    };
    set({ cards: { ...get().cards, [id]: card } });
    persist();
    return [card];
  },
}));
