import type { Card, ColumnId } from "./types";

export const RANK_GAP = 1024;
const TOMBSTONE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const TOMBSTONE_MAX = 200;

export function mergeCard(local: Card | undefined, incoming: Card): Card {
  if (!local) return incoming;
  if (incoming.updatedAt > local.updatedAt) return incoming;
  if (incoming.updatedAt < local.updatedAt) return local;
  // Tie-break so two peers converge without thrash.
  return incoming.authorId < local.authorId ? incoming : local;
}

export function mergeCards(
  local: Record<string, Card>,
  incoming: Card[],
): Record<string, Card> {
  const next = { ...local };
  let changed = false;
  for (const card of incoming) {
    const merged = mergeCard(next[card.id], card);
    if (merged !== next[card.id]) {
      next[card.id] = merged;
      changed = true;
    }
  }
  return changed ? next : local;
}

export function rankAt(before?: number, after?: number): number {
  if (before == null && after == null) return RANK_GAP;
  if (before == null) return after! - RANK_GAP;
  if (after == null) return before + RANK_GAP;
  return (before + after) / 2;
}

/** True when float midpoint can no longer sit strictly between neighbors. */
export function needsRebalance(before?: number, after?: number): boolean {
  if (before == null || after == null) return false;
  const mid = (before + after) / 2;
  return mid <= before || mid >= after;
}

export function rebalanceRanks(orderedIds: string[]): Record<string, number> {
  const ranks: Record<string, number> = {};
  orderedIds.forEach((id, i) => {
    ranks[id] = (i + 1) * RANK_GAP;
  });
  return ranks;
}

export function cardsInColumn(
  cards: Record<string, Card>,
  column: ColumnId,
): Card[] {
  return Object.values(cards)
    .filter((c) => !c.deleted && c.column === column)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

export function visibleCount(cards: Record<string, Card>, column: ColumnId): number {
  let n = 0;
  for (const c of Object.values(cards)) {
    if (!c.deleted && c.column === column) n += 1;
  }
  return n;
}

/**
 * Drop stale tombstones so a long-lived board cannot grow without bound.
 * Live cards are never removed. Resurrection of a very old delete is possible
 * if an offline peer returns after the window — acceptable for a family board.
 */
export function pruneCards(cards: Record<string, Card>, now: number): Record<string, Card> {
  const deleted = Object.values(cards)
    .filter((c) => c.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const keep = new Set(
    deleted
      .filter((c) => now - c.updatedAt < TOMBSTONE_MAX_AGE_MS)
      .slice(0, TOMBSTONE_MAX)
      .map((c) => c.id),
  );
  let changed = false;
  const next: Record<string, Card> = {};
  for (const [id, card] of Object.entries(cards)) {
    if (card.deleted && !keep.has(id)) {
      changed = true;
      continue;
    }
    next[id] = card;
  }
  return changed ? next : cards;
}
