import { createFileRoute } from "@tanstack/react-router";
import { flushDueNudges, json } from "@/lib/board/push.server";

async function handleGet() {
  const result = await flushDueNudges();
  return json(result);
}

export const Route = createFileRoute("/api/push/tick")({
  server: { handlers: { GET: handleGet } },
});
