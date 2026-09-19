import { parseCard } from "./schema";
import type { Card } from "./types";

function key(room: string) {
  return `slip.outbox.${room}`;
}

function read(room: string): Card[] {
  try {
    const raw = localStorage.getItem(key(room));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { cards?: unknown };
    if (!Array.isArray(parsed.cards)) return [];
    const byId = new Map<string, Card>();
    for (const item of parsed.cards) {
      const card = parseCard(item);
      if (card) byId.set(card.id, card);
    }
    return [...byId.values()];
  } catch {
    return [];
  }
}

function write(room: string, cards: Card[]): void {
  try {
    if (cards.length === 0) localStorage.removeItem(key(room));
    else localStorage.setItem(key(room), JSON.stringify({ cards }));
  } catch {
    /* quota / private mode — in-memory caller still holds the card */
  }
}

export function loadOutbox(room: string): Card[] {
  return read(room);
}

/** Latest put per card id wins. */
export function enqueueOutbox(room: string, card: Card): Card[] {
  const next = read(room).filter((c) => c.id !== card.id);
  next.push(card);
  write(room, next);
  return next;
}

export function clearOutbox(room: string): void {
  write(room, []);
}
