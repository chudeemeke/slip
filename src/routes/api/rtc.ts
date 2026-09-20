import { createFileRoute } from "@tanstack/react-router";
import { flushDueNudges } from "@/lib/board/push.server";
import { handleSignaling } from "@/lib/multiplayer/signaling.server";

const handle = async ({ request }: { request: Request }) => {
  const response = await handleSignaling(request);
  if (request.method === "GET") void flushDueNudges().catch(() => {});
  return response;
};

export const Route = createFileRoute("/api/rtc")({
  server: { handlers: { GET: handle, POST: handle } },
});
