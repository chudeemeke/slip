import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyNudge,
  isDoingStale,
  isNudgeDue,
  laneStamp,
  nextMorning,
  nudgeAfterMove,
  STALE_DOING_MS,
} from "./flow.ts";
import type { Card } from "./types.ts";

function card(over: Partial<Card> = {}): Card {
  return {
    id: "c1",
    title: "Task",
    description: "",
    column: "doing",
    rank: 1024,
    updatedAt: 1,
    laneAt: 1,
    deleted: false,
    authorId: "a",
    authorName: "Ada",
    nudgeAt: null,
    nudgeColumn: null,
    ...over,
  };
}

describe("nextMorning", () => {
  it("returns 8:00 today when it is still early", () => {
    const seven = new Date(2026, 8, 19, 7, 15, 0).getTime();
    const at = new Date(nextMorning(seven));
    assert.equal(at.getHours(), 8);
    assert.equal(at.getDate(), 19);
  });

  it("rolls to tomorrow after 8:00", () => {
    const nine = new Date(2026, 8, 19, 9, 0, 0).getTime();
    const at = new Date(nextMorning(nine));
    assert.equal(at.getHours(), 8);
    assert.equal(at.getDate(), 20);
  });
});

describe("aging and nudges", () => {
  const now = 1_000_000_000_000;

  it("marks Doing cards stale after twelve hours in the lane", () => {
    assert.equal(isDoingStale(card({ laneAt: now - STALE_DOING_MS }), now), true);
    assert.equal(isDoingStale(card({ laneAt: now - 60_000 }), now), false);
    assert.equal(isDoingStale(card({ column: "todo", laneAt: now - STALE_DOING_MS }), now), false);
  });

  it("fires a nudge only if the card is still in that lane", () => {
    const due = card({ nudgeAt: now - 1, nudgeColumn: "doing", column: "doing" });
    assert.equal(isNudgeDue(due, now), true);
    assert.equal(isNudgeDue({ ...due, column: "done" }, now), false);
    assert.equal(isNudgeDue(card({ nudgeAt: now + 10_000, nudgeColumn: "doing" }), now), false);
  });

  it("keeps a future morning nudge on re-save, and clears on Off", () => {
    const existing = card({
      column: "todo",
      nudgeAt: now + 3_600_000,
      nudgeColumn: "todo",
    });
    assert.deepEqual(applyNudge("morning", "todo", existing, now), {
      nudgeAt: existing.nudgeAt,
      nudgeColumn: "todo",
    });
    assert.deepEqual(applyNudge("off", "todo", existing, now), {
      nudgeAt: null,
      nudgeColumn: null,
    });
  });

  it("resets lane time when the column changes, and drops a mismatched nudge", () => {
    const existing = card({
      column: "todo",
      laneAt: 50,
      nudgeAt: now + 1,
      nudgeColumn: "todo",
    });
    assert.equal(laneStamp(existing, "todo", now), 50);
    assert.equal(laneStamp(existing, "doing", now), now);
    assert.deepEqual(nudgeAfterMove(existing, "doing"), { nudgeAt: null, nudgeColumn: null });
  });
});
