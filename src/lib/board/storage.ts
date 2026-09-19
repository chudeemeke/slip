import { currentTime, hydrateClock, tick } from "./clock";
import { entityId } from "./ids";
import { parseCard } from "./schema";
import { pruneCards } from "./merge";
import type { Card, Identity } from "./types";

const IDENTITY_KEY = "slip.identity";
const LAST_ROOM_KEY = "slip.lastRoom";
const CLOCK_KEY = "slip.clock";

function boardKey(room: string) {
  return `slip.board.${room}`;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadClock(): number {
  const raw = readRaw(CLOCK_KEY);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function saveClock(value: number): void {
  writeRaw(CLOCK_KEY, String(value));
}

export function loadIdentity(): Identity | null {
  try {
    const raw = readRaw(IDENTITY_KEY);
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
  writeRaw(IDENTITY_KEY, JSON.stringify(identity));
}

export function ensureIdentity(name: string): Identity {
  const existing = loadIdentity();
  const identity: Identity = {
    id: existing?.id ?? entityId("u"),
    name: name.trim().slice(0, 24),
  };
  saveIdentity(identity);
  return identity;
}

export function loadLastRoom(): string | null {
  try {
    const room = readRaw(LAST_ROOM_KEY);
    return room && /^[A-Z0-9]{6}$/.test(room) ? room : null;
  } catch {
    return null;
  }
}

export function saveLastRoom(room: string | null): void {
  if (!room) removeRaw(LAST_ROOM_KEY);
  else writeRaw(LAST_ROOM_KEY, room);
}

export function loadBoard(room: string): Record<string, Card> {
  try {
    const raw = readRaw(boardKey(room));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { cards?: Record<string, unknown> };
    if (!parsed.cards || typeof parsed.cards !== "object") return {};
    const cards: Record<string, Card> = {};
    let maxTs = 0;
    for (const [id, value] of Object.entries(parsed.cards)) {
      const card = parseCard(value) ?? parseCard({ ...(value as object), id });
      if (!card) continue;
      cards[card.id] = card;
      if (card.updatedAt > maxTs) maxTs = card.updatedAt;
    }
    hydrateClock(maxTs);
    return cards;
  } catch {
    return {};
  }
}

export function saveBoard(room: string, cards: Record<string, Card>): Record<string, Card> {
  const pruned = pruneCards(cards, currentTime() || Date.now());
  writeRaw(boardKey(room), JSON.stringify({ cards: pruned }));
  saveClock(currentTime());
  return pruned;
}

export function sampleCards(authorId: string, authorName: string): Record<string, Card> {
  const seed: Array<Omit<Card, "id" | "updatedAt" | "deleted" | "authorId" | "authorName">> = [
    {
      title: "Pack snacks for the picnic",
      description: "Fruit, water, and the checkered blanket.",
      column: "todo",
      rank: 1024,
    },
    {
      title: "Return the library books",
      description: "They are due Friday — the stack by the door.",
      column: "todo",
      rank: 2048,
    },
    {
      title: "Practice piano for 20 minutes",
      description: "The river étude, slow then up to tempo.",
      column: "doing",
      rank: 1024,
    },
    {
      title: "Hang the new prints",
      description: "Two frames in the hallway, level and 60 inches on center.",
      column: "done",
      rank: 1024,
    },
  ];
  const cards: Record<string, Card> = {};
  seed.forEach((item) => {
    const id = entityId("c");
    cards[id] = {
      ...item,
      id,
      updatedAt: tick(),
      deleted: false,
      authorId,
      authorName,
    };
  });
  return cards;
}
