import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cardsInColumn,
  mergeCard,
  mergeCards,
  needsRebalance,
  pruneCards,
  rankAt,
  rebalanceRanks,
  RANK_GAP,
} from "./merge.ts";
import type { Card } from "./types.ts";

function card(over: Partial<Card> & Pick<Card, "id">): Card {
  return {
    title: "Task",
    description: "",
    column: "todo",
    rank: RANK_GAP,
    updatedAt: 1,
    deleted: false,
    authorId: "a",
    authorName: "Ada",
    ...over,
  };
}

describe("mergeCard", () => {
  it("takes incoming when local is missing", () => {
    const incoming = card({ id: "c1", updatedAt: 10 });
    assert.equal(mergeCard(undefined, incoming), incoming);
  });

  it("last-write-wins by updatedAt", () => {
    const local = card({ id: "c1", title: "old", updatedAt: 10 });
    const incoming = card({ id: "c1", title: "new", updatedAt: 11 });
    assert.equal(mergeCard(local, incoming).title, "new");
    assert.equal(mergeCard(incoming, local).title, "new");
  });

  it("tie-breaks by authorId so peers converge", () => {
    const a = card({ id: "c1", title: "A", updatedAt: 5, authorId: "aaa" });
    const b = card({ id: "c1", title: "B", updatedAt: 5, authorId: "zzz" });
    assert.equal(mergeCard(a, b).title, "A");
    assert.equal(mergeCard(b, a).title, "A");
  });

  it("keeps a newer tombstone over an older live card", () => {
    const live = card({ id: "c1", deleted: false, updatedAt: 10 });
    const tomb = card({ id: "c1", deleted: true, updatedAt: 11 });
    assert.equal(mergeCard(live, tomb).deleted, true);
  });
});

describe("mergeCards", () => {
  it("returns the same map when nothing changes", () => {
    const local = { c1: card({ id: "c1", updatedAt: 10 }) };
    const next = mergeCards(local, [card({ id: "c1", updatedAt: 9 })]);
    assert.equal(next, local);
  });

  it("inserts unknown ids", () => {
    const next = mergeCards({}, [card({ id: "c2" })]);
    assert.equal(next.c2?.id, "c2");
  });
});

describe("rankAt", () => {
  it("starts a column on the gap", () => {
    assert.equal(rankAt(), RANK_GAP);
  });

  it("appends after the last card", () => {
    assert.equal(rankAt(2048), 2048 + RANK_GAP);
  });

  it("inserts at the midpoint", () => {
    assert.equal(rankAt(1024, 2048), 1536);
  });

  it("flags exhausted float precision", () => {
    assert.equal(needsRebalance(1, 2), false);
    const x = 1;
    const y = x + Number.EPSILON / 2;
    assert.equal(needsRebalance(x, x), true);
    assert.equal(Number.isFinite(y), true);
  });

  it("rebalance assigns evenly spaced ranks", () => {
    const ranks = rebalanceRanks(["a", "b", "c"]);
    assert.deepEqual(ranks, { a: 1024, b: 2048, c: 3072 });
  });
});

describe("cardsInColumn", () => {
  it("hides tombstones and sorts by rank then id", () => {
    const cards = {
      b: card({ id: "b", rank: 1, column: "todo" }),
      a: card({ id: "a", rank: 1, column: "todo" }),
      d: card({ id: "d", rank: 1, column: "todo", deleted: true }),
      c: card({ id: "c", rank: 2, column: "doing" }),
    };
    const list = cardsInColumn(cards, "todo");
    assert.deepEqual(
      list.map((c) => c.id),
      ["a", "b"],
    );
  });
});

describe("pruneCards", () => {
  it("drops tombstones older than two weeks", () => {
    const now = 1_800_000_000_000;
    const fresh = card({ id: "fresh", deleted: true, updatedAt: now - 1000 });
    const stale = card({
      id: "stale",
      deleted: true,
      updatedAt: now - 15 * 24 * 60 * 60 * 1000,
    });
    const live = card({ id: "live", deleted: false, updatedAt: 1 });
    const next = pruneCards({ fresh, stale, live }, now);
    assert.ok(next.fresh);
    assert.ok(next.live);
    assert.equal(next.stale, undefined);
  });

  it("never drops a live card", () => {
    const now = Date.now();
    const live = card({ id: "live", updatedAt: 1 });
    assert.equal(pruneCards({ live }, now).live, live);
  });
});
