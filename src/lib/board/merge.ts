import type { Card } from "./types";

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
  if (before == null && after == null) return 1;
  if (before == null) return after! - 1;
  if (after == null) return before + 1;
  const mid = (before + after) / 2;
  if (after - before < 1e-6) return before + 1;
  return mid;
}

export function cardsInColumn(
  cards: Record<string, Card>,
  column: Card["column"],
): Card[] {
  return Object.values(cards)
    .filter((c) => !c.deleted && c.column === column)
    .sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

export function visibleCount(cards: Record<string, Card>, column: Card["column"]): number {
  let n = 0;
  for (const c of Object.values(cards)) {
    if (!c.deleted && c.column === column) n += 1;
  }
  return n;
}
