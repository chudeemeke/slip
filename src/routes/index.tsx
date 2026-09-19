import { createFileRoute } from "@tanstack/react-router";
import { SlipApp } from "@/components/board/app";

type Search = {
  room?: string;
};

export const Route = createFileRoute("/")({
  component: Home,
  validateSearch: (search: Record<string, unknown>): Search => ({
    room: typeof search.room === "string" ? search.room : undefined,
  }),
});

function Home() {
  const { room } = Route.useSearch();
  return <SlipApp roomFromUrl={room} />;
}
