import type { Card, ColumnId } from "./types";

export const MORNING_HOUR = 8;
export const STALE_DOING_MS = 12 * 60 * 60 * 1000;

export type NudgeChoice = "off" | "morning";

/** Next 8:00 local. If it is already 8:00 or later, that is tomorrow morning. */
export function nextMorning(now = Date.now()): number {
  const d = new Date(now);
  const target = new Date(d);
  target.setHours(MORNING_HOUR, 0, 0, 0);
  if (d.getTime() >= target.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}

export function isDoingStale(card: Card, now = Date.now()): boolean {
  if (card.deleted || card.column !== "doing") return false;
  return now - card.laneAt >= STALE_DOING_MS;
}

export function isNudgeDue(card: Card, now = Date.now()): boolean {
  if (card.deleted || card.nudgeAt == null || card.nudgeColumn == null) return false;
  return now >= card.nudgeAt && card.column === card.nudgeColumn;
}

export function dueNudgeCards(cards: Card[], now = Date.now()): Card[] {
  return cards.filter((c) => isNudgeDue(c, now));
}

export function nudgeChoice(card?: Card, now = Date.now()): NudgeChoice {
  if (!card?.nudgeAt || !card.nudgeColumn) return "off";
  if (card.nudgeAt > now && card.nudgeColumn === card.column) return "morning";
  if (isNudgeDue(card, now)) return "morning";
  return "off";
}

export function applyNudge(
  choice: NudgeChoice,
  column: ColumnId,
  existing: Card | undefined,
  now = Date.now(),
): { nudgeAt: number | null; nudgeColumn: ColumnId | null } {
  if (choice === "off") return { nudgeAt: null, nudgeColumn: null };
  if (
    existing &&
    existing.nudgeAt != null &&
    existing.nudgeAt > now &&
    existing.nudgeColumn === column
  ) {
    return { nudgeAt: existing.nudgeAt, nudgeColumn: column };
  }
  return { nudgeAt: nextMorning(now), nudgeColumn: column };
}

export function laneStamp(existing: Card | undefined, column: ColumnId, now: number): number {
  if (!existing) return now;
  if (existing.column !== column) return now;
  return existing.laneAt;
}

export function nudgeAfterMove(
  card: Card,
  column: ColumnId,
): { nudgeAt: number | null; nudgeColumn: ColumnId | null } {
  if (card.nudgeColumn && card.nudgeColumn !== column) {
    return { nudgeAt: null, nudgeColumn: null };
  }
  return { nudgeAt: card.nudgeAt, nudgeColumn: card.nudgeColumn };
}
