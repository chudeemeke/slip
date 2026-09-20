/**
 * Lock-screen morning nudges. Stores only a Web Push endpoint and a wake time —
 * never card titles, names, or room codes. Unowned rows (auth is off).
 */
import { getSql, type Sql } from "@/lib/db";

const VAPID_SUBJECT = "https://github.com/chudeemeke/slip";
const MAX_WAKES = 8000;
const MAX_BATCH = 40;
const FLUSH_GAP_MS = 60_000;

const globalRef = globalThis as typeof globalThis & {
  __slipPushSchema__?: Promise<void>;
  __slipPushFlushAt__?: number;
};

function jsonHeaders(): HeadersInit {
  return { "content-type": "application/json", "cache-control": "no-store" };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders() });
}

async function ensureSchema(sql: Sql): Promise<void> {
  globalRef.__slipPushSchema__ ??= (async () => {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS vapid_keys (
         id integer PRIMARY KEY,
         public_key text NOT NULL,
         private_key text NOT NULL
       )`,
    );
    await sql.query(
      `CREATE TABLE IF NOT EXISTS nudge_wakes (
         endpoint text PRIMARY KEY,
         p256dh text NOT NULL,
         auth text NOT NULL,
         wake_at bigint NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await sql.query(`CREATE INDEX IF NOT EXISTS nudge_wakes_due ON nudge_wakes (wake_at)`);
  })().catch((err) => {
    globalRef.__slipPushSchema__ = undefined;
    throw err;
  });
  return globalRef.__slipPushSchema__;
}

type VapidRow = { public_key: string; private_key: string };

async function loadVapid(sql: Sql): Promise<VapidRow> {
  const existing = await sql.query<VapidRow>(`SELECT public_key, private_key FROM vapid_keys WHERE id = 1`);
  if (existing[0]) return existing[0];
  const webpush = (await import("web-push")).default;
  const keys = webpush.generateVAPIDKeys();
  await sql.query(
    `INSERT INTO vapid_keys (id, public_key, private_key) VALUES (1, $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [keys.publicKey, keys.privateKey],
  );
  const again = await sql.query<VapidRow>(`SELECT public_key, private_key FROM vapid_keys WHERE id = 1`);
  return again[0] ?? { public_key: keys.publicKey, private_key: keys.privateKey };
}

export async function vapidPublicKey(): Promise<string> {
  const sql = await getSql();
  await ensureSchema(sql);
  const keys = await loadVapid(sql);
  return keys.public_key;
}

export async function upsertWake(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  wakeAt: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = await getSql();
  await ensureSchema(sql);
  const countRows = await sql.query<{ n: number }>(`SELECT count(*)::int AS n FROM nudge_wakes`);
  const n = countRows[0]?.n ?? 0;
  const exists = await sql.query<{ endpoint: string }>(
    `SELECT endpoint FROM nudge_wakes WHERE endpoint = $1`,
    [input.endpoint],
  );
  if (!exists[0] && n >= MAX_WAKES) return { ok: false, error: "full" };
  await sql.query(
    `INSERT INTO nudge_wakes (endpoint, p256dh, auth, wake_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint)
     DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, wake_at = EXCLUDED.wake_at`,
    [input.endpoint, input.p256dh, input.auth, input.wakeAt],
  );
  return { ok: true };
}

export async function deleteWake(endpoint: string): Promise<void> {
  const sql = await getSql();
  await ensureSchema(sql);
  await sql.query(`DELETE FROM nudge_wakes WHERE endpoint = $1`, [endpoint]);
}

type WakeRow = { endpoint: string; p256dh: string; auth: string; wake_at: number };

export async function flushDueNudges(now = Date.now()): Promise<{ sent: number }> {
  const last = globalRef.__slipPushFlushAt__ ?? 0;
  if (now - last < FLUSH_GAP_MS) return { sent: 0 };
  globalRef.__slipPushFlushAt__ = now;

  const sql = await getSql();
  await ensureSchema(sql);
  await sql.query(`DELETE FROM nudge_wakes WHERE wake_at < $1`, [now - 14 * 24 * 60 * 60 * 1000]);
  const due = await sql.query<WakeRow>(
    `SELECT endpoint, p256dh, auth, wake_at FROM nudge_wakes
     WHERE wake_at <= $1
     ORDER BY wake_at
     LIMIT $2`,
    [now, MAX_BATCH],
  );
  if (due.length === 0) return { sent: 0 };

  const keys = await loadVapid(sql);
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(VAPID_SUBJECT, keys.public_key, keys.private_key);
  const payload = JSON.stringify({ title: "Slip", body: "A card is still here." });

  let sent = 0;
  for (const row of due) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        payload,
        { TTL: 60 * 60, urgency: "normal" },
      );
      sent += 1;
      await sql.query(`DELETE FROM nudge_wakes WHERE endpoint = $1`, [row.endpoint]);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410 || status === 403) {
        await sql.query(`DELETE FROM nudge_wakes WHERE endpoint = $1`, [row.endpoint]);
      }
    }
  }
  return { sent };
}
