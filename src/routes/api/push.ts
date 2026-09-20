import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { deleteWake, json, upsertWake, vapidPublicKey } from "@/lib/board/push.server";

const endpoint = z
  .string()
  .min(12)
  .max(2048)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  });

const key = z.string().min(8).max(256);

const postSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("subscribe"),
    endpoint,
    p256dh: key,
    auth: key,
    wakeAt: z.number().finite(),
  }),
  z.object({
    op: z.literal("unsubscribe"),
    endpoint,
  }),
]);

async function handleGet() {
  const publicKey = await vapidPublicKey();
  return json({ publicKey });
}

async function handlePost({ request }: { request: Request }) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid" }, 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid" }, 400);

  if (parsed.data.op === "unsubscribe") {
    await deleteWake(parsed.data.endpoint);
    return json({ ok: true });
  }

  const now = Date.now();
  const max = now + 14 * 24 * 60 * 60 * 1000;
  const wakeAt = Math.min(Math.max(parsed.data.wakeAt, now), max);
  const result = await upsertWake({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.p256dh,
    auth: parsed.data.auth,
    wakeAt,
  });
  if (!result.ok) return json({ error: result.error }, 503);
  return json({ ok: true });
}

export const Route = createFileRoute("/api/push")({
  server: { handlers: { GET: handleGet, POST: handlePost } },
});
