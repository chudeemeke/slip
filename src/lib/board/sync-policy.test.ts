import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldOfferSnapshot } from "./sync-policy.ts";

describe("shouldOfferSnapshot", () => {
  it("lets the room owner (has cards, no peers yet) greet the first joiner", () => {
    assert.equal(shouldOfferSnapshot("p-z", [], 4), true);
  });

  it("stops a newcomer with an empty board from snapshotting the owner", () => {
    assert.equal(shouldOfferSnapshot("p-a", [], 0), false);
  });

  it("picks the lexicographically smallest incumbent", () => {
    assert.equal(shouldOfferSnapshot("p-b", ["p-a"], 4), false);
    assert.equal(shouldOfferSnapshot("p-a", ["p-b"], 4), true);
  });
});
