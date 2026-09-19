import { z } from "zod";
import type { Card, Identity, PeerMsg } from "./types";

export const TITLE_MAX = 200;
export const DESC_MAX = 4000;

const columnId = z.enum(["todo", "doing", "done"]);

export const cardSchema = z
  .object({
    id: z.string().min(1).max(80),
    title: z.string().max(TITLE_MAX),
    description: z.string().max(DESC_MAX),
    column: columnId,
    rank: z.number().finite(),
    updatedAt: z.number().finite(),
    deleted: z.boolean(),
    authorId: z.string().min(1).max(80),
    authorName: z.string().max(24),
  })
  .refine((card) => card.deleted || card.title.trim().length > 0, {
    message: "live cards need a title",
  });

const identitySchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(24),
});

const peerMsgSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("snap"), cards: z.array(z.unknown()).max(2000) }),
  z.object({ t: z.literal("put"), card: z.unknown() }),
  z.object({ t: z.literal("hello"), identity: identitySchema }),
]);

export function parseCard(input: unknown): Card | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const result = cardSchema.safeParse({
    ...raw,
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    deleted: Boolean(raw.deleted),
    authorId: typeof raw.authorId === "string" && raw.authorId ? raw.authorId : "local",
    authorName:
      typeof raw.authorName === "string" && raw.authorName.trim() ? raw.authorName : "Guest",
  });
  if (!result.success) return null;
  const card = result.data;
  return {
    ...card,
    title: card.title.trim(),
    description: card.description.trim(),
    authorName: card.authorName.trim() || "Guest",
  };
}

export function parseIdentity(input: unknown): Identity | null {
  const result = identitySchema.safeParse(input);
  if (!result.success) return null;
  return { id: result.data.id, name: result.data.name.trim().slice(0, 24) };
}

export function parsePeerMsg(input: unknown): PeerMsg | null {
  const result = peerMsgSchema.safeParse(input);
  if (!result.success) return null;
  const msg = result.data;
  if (msg.t === "put") {
    const card = parseCard(msg.card);
    return card ? { t: "put", card } : null;
  }
  if (msg.t === "snap") {
    const cards = msg.cards.map(parseCard).filter((c): c is Card => c !== null);
    return { t: "snap", cards };
  }
  return { t: "hello", identity: msg.identity };
}
