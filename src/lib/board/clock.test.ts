import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { currentTime, hydrateClock, observeTime, resetClock, tick } from "./clock.ts";

describe("hybrid logical clock", () => {
  beforeEach(() => resetClock(0));

  it("ticks monotonically even if wall time goes backwards", () => {
    const a = tick(100);
    const b = tick(50);
    assert.equal(a, 100);
    assert.equal(b, 101);
    assert.ok(b > a);
  });

  it("catches up to a remote future timestamp", () => {
    tick(100);
    observeTime(500, 120);
    assert.equal(currentTime(), 500);
    assert.equal(tick(130), 501);
  });

  it("hydrate only moves the clock forward", () => {
    hydrateClock(80);
    hydrateClock(40);
    assert.equal(currentTime(), 80);
  });
});
