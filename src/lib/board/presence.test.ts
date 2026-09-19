import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { presenceRows } from "./presence.ts";
import type { PeerInfo } from "../multiplayer/p2p.ts";

function peer(over: Partial<PeerInfo> & Pick<PeerInfo, "id">): PeerInfo {
  return {
    name: "Guest",
    connectionState: "connected",
    candidateType: "srflx",
    rttMs: 12,
    ...over,
  };
}

describe("presenceRows", () => {
  const self = { id: "u-ada", name: "Ada" };

  it("always includes this device first", () => {
    const rows = presenceRows(self, [], {});
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.you, true);
    assert.equal(rows[0]?.name, "Ada");
  });

  it("collapses two mesh sessions of the same person", () => {
    const rows = presenceRows(
      self,
      [
        peer({ id: "p-1", name: "Bea", connectionState: "connecting" }),
        peer({ id: "p-2", name: "Bea", connectionState: "connected", rttMs: 40 }),
      ],
      {
        "p-1": { id: "u-bea", name: "Bea" },
        "p-2": { id: "u-bea", name: "Bea" },
      },
    );
    assert.equal(rows.length, 2);
    const bea = rows.find((r) => r.key === "u-bea");
    assert.equal(bea?.status, "connected");
    assert.equal(bea?.rtt, 40);
  });

  it("does not list a remount of self as a second person", () => {
    const rows = presenceRows(self, [peer({ id: "p-old", name: "Ada" })], {
      "p-old": { id: "u-ada", name: "Ada" },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.you, true);
  });
});
