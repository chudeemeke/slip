import { uid } from "@/lib/utils";
import type { Card, Identity } from "./types";

const IDENTITY_KEY = "slip.identity";
const LAST_ROOM_KEY = "slip.lastRoom";

function boardKey(room: string) {
  return `slip.board.${room}`;
}

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (typeof parsed.id === "string" && typeof parsed.name === "string" && parsed.name.trim()) {
      return { id: parsed.id, name: parsed.name.trim().slice(0, 24) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveIdentity(identity: Identity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export function ensureIdentity(name: string): Identity {
  const existing = loadIdentity();
  const identity: Identity = {
    id: existing?.id ?? uid("u"),
    name: name.trim().slice(0, 24),
  };
  saveIdentity(identity);
  return identity;
}

export function loadLastRoom(): string | null {
  try {
    const room = localStorage.getItem(LAST_ROOM_KEY);
    return room && /^[A-Z0-9]{6}$/.test(room) ? room : null;
  } catch {
    return null;
  }
}

export function saveLastRoom(room: string | null): void {
  if (!room) localStorage.removeItem(LAST_ROOM_KEY);
  else localStorage.setItem(LAST_ROOM_KEY, room);
}

export function loadBoard(room: string): Record<string, Card> {
  try {
    const raw = localStorage.getItem(boardKey(room));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { cards?: Record<string, Card> };
    if (!parsed.cards || typeof parsed.cards !== "object") return {};
    const cards: Record<string, Card> = {};
    for (const [id, card] of Object.entries(parsed.cards)) {
      if (!card || typeof card !== "object") continue;
      cards[id] = {
        ...card,
        authorName: card.authorName || "Guest",
      };
    }
    return cards;
  } catch {
    return {};
  }
}

export function saveBoard(room: string, cards: Record<string, Card>): void {
  localStorage.setItem(boardKey(room), JSON.stringify({ cards }));
}

export function sampleCards(authorId: string, authorName: string): Record<string, Card> {
  const now = Date.now();
  const seed: Array<Omit<Card, "id" | "updatedAt" | "deleted" | "authorId" | "authorName">> = [
    {
      title: "Pack snacks for the picnic",
      description: "Fruit, water, and the checkered blanket.",
      column: "todo",
      rank: 1,
    },
    {
      title: "Return the library books",
      description: "They are due Friday — the stack by the door.",
      column: "todo",
      rank: 2,
    },
    {
      title: "Practice piano for 20 minutes",
      description: "The river étude, slow then up to tempo.",
      column: "doing",
      rank: 1,
    },
    {
      title: "Hang the new prints",
      description: "Two frames in the hallway, level and 60 inches on center.",
      column: "done",
      rank: 1,
    },
  ];
  const cards: Record<string, Card> = {};
  seed.forEach((item, i) => {
    const id = uid("c");
    cards[id] = {
      ...item,
      id,
      updatedAt: now - (seed.length - i) * 1000,
      deleted: false,
      authorId,
      authorName,
    };
  });
  return cards;
}
