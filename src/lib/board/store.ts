import { create } from "zustand";
import { uid } from "@/lib/utils";
import { makeRoomCode } from "./ids";
import { cardsInColumn, mergeCard, mergeCards, rankAt } from "./merge";
import {
  ensureIdentity,
  loadBoard,
  loadIdentity,
  saveBoard,
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
  joinBoard: (code: string) => void;
  leaveBoard: () => void;
  setActiveColumn: (column: ColumnId) => void;
  applyRemoteCards: (incoming: Card[]) => void;
  applyRemoteCard: (incoming: Card) => void;
  upsertCard: (input: {
    id?: string;
    title: string;
    description: string;
    column: ColumnId;
  }) => Card;
  deleteCard: (id: string) => Card | null;
  moveCard: (id: string, column: ColumnId, index: number) => Card | null;
};

function persist() {
  const { room, cards } = useBoardStore.getState();
  if (room) saveBoard(room, cards);
}

export const useBoardStore = create<BoardStore>((set, get) => ({
  identity: null,
  room: null,
  cards: {},
  activeColumn: "todo",
  ready: false,

  boot: () => {
    if (get().ready) return;
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
    const room = makeRoomCode();
    const cards = sampleCards(identity.id, identity.name);
    saveLastRoom(room);
    saveBoard(room, cards);
    set({ identity, room, cards, activeColumn: "todo" });
    return room;
  },

  joinBoard: (code: string) => {
    const room = code.toUpperCase();
    const identity = get().identity ?? loadIdentity();
    const cards = loadBoard(room);
    saveLastRoom(room);
    set({ identity, room, cards, activeColumn: "todo" });
  },

  leaveBoard: () => {
    persist();
    saveLastRoom(null);
    set({ room: null, cards: {}, activeColumn: "todo" });
  },

  setActiveColumn: (column) => set({ activeColumn: column }),

  applyRemoteCards: (incoming) => {
    const merged = mergeCards(get().cards, incoming);
    if (merged === get().cards) return;
    set({ cards: merged });
    persist();
  },

  applyRemoteCard: (incoming) => {
    const current = get().cards[incoming.id];
    const merged = mergeCard(current, incoming);
    if (merged === current) return;
    set({ cards: { ...get().cards, [incoming.id]: merged } });
    persist();
  },

  upsertCard: ({ id, title, description, column }) => {
    const identity = get().identity;
    const existing = id ? get().cards[id] : undefined;
    const list = cardsInColumn(get().cards, column);
    const card: Card = {
      id: existing?.id ?? uid("c"),
      title: title.trim(),
      description: description.trim(),
      column,
      rank:
        existing && existing.column === column
          ? existing.rank
          : rankAt(list.at(-1)?.rank),
      updatedAt: Date.now(),
      deleted: false,
      authorId: identity?.id ?? "local",
      authorName: identity?.name ?? "Guest",
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
      updatedAt: Date.now(),
      authorId: get().identity?.id ?? existing.authorId,
      authorName: get().identity?.name ?? existing.authorName,
    };
    set({ cards: { ...get().cards, [id]: card } });
    persist();
    return card;
  },

  moveCard: (id, column, index) => {
    const existing = get().cards[id];
    if (!existing) return null;
    const list = cardsInColumn(get().cards, column).filter((c) => c.id !== id);
    const clamped = Math.max(0, Math.min(index, list.length));
    const before = list[clamped - 1]?.rank;
    const after = list[clamped]?.rank;
    const card: Card = {
      ...existing,
      column,
      rank: rankAt(before, after),
      updatedAt: Date.now(),
      deleted: false,
      authorId: get().identity?.id ?? existing.authorId,
      authorName: get().identity?.name ?? existing.authorName,
    };
    set({ cards: { ...get().cards, [id]: card } });
    persist();
    return card;
  },
}));
