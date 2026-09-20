import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alertsCaption, urlBase64ToUint8Array } from "./alerts.ts";

describe("alerts helpers", () => {
  it("decodes a VAPID key from URL-safe base64", () => {
    const bytes = urlBase64ToUint8Array("AQID");
    assert.deepEqual([...bytes], [1, 2, 3]);
  });

  it("explains Home Screen and on-state without leaking board data", () => {
    assert.match(alertsCaption("need-home"), /Home Screen/);
    assert.match(alertsCaption("on"), /Titles stay on this phone/);
    assert.match(alertsCaption("on"), /Lock Screen/);
  });
});
