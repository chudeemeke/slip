import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCard, parsePeerMsg } from "./schema.ts";

const valid = {
  id: "c-1",
  title: "Milk",
  description: "2%",
  column: "todo",
  rank: 1024,
  updatedAt: 10,
  laneAt: 10,
  deleted: false,
  authorId: "u-1",
  authorName: "Ada",
  nudgeAt: null,
  nudgeColumn: null,
};

describe("parseCard", () => {
  it("accepts a well-formed card", () => {
    const card = parseCard(valid);
    assert.equal(card?.title, "Milk");
  });

  it("rejects a live card with an empty title", () => {
    assert.equal(parseCard({ ...valid, title: "   " }), null);
  });

  it("rejects an unknown column", () => {
    assert.equal(parseCard({ ...valid, column: "banana" }), null);
  });

  it("fills missing author fields from older snapshots", () => {
    const { authorId: _a, authorName: _n, ...rest } = valid;
    const card = parseCard(rest);
    assert.equal(card?.authorName, "Guest");
    assert.equal(card?.authorId, "local");
  });

  it("falls back to updatedAt when laneAt is missing", () => {
    const { laneAt: _l, ...rest } = valid;
    const card = parseCard(rest);
    assert.equal(card?.laneAt, 10);
    assert.equal(card?.nudgeAt, null);
  });

  it("allows a tombstone with an empty title", () => {
    const card = parseCard({ ...valid, title: "", deleted: true });
    assert.equal(card?.deleted, true);
  });
});

describe("parsePeerMsg", () => {
  it("drops garbage put payloads", () => {
    assert.equal(parsePeerMsg({ t: "put", card: { nope: true } }), null);
  });

  it("keeps only valid cards in a snapshot", () => {
    const msg = parsePeerMsg({
      t: "snap",
      cards: [valid, { id: "bad" }, { ...valid, id: "c-2", title: "Eggs" }],
    });
    assert.equal(msg?.t, "snap");
    if (msg?.t === "snap") {
      assert.deepEqual(
        msg.cards.map((c) => c.id),
        ["c-1", "c-2"],
      );
    }
  });

  it("accepts hello identities", () => {
    const msg = parsePeerMsg({ t: "hello", identity: { id: "u-1", name: "Ada" } });
    assert.deepEqual(msg, { t: "hello", identity: { id: "u-1", name: "Ada" } });
  });
});
