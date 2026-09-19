import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PhoneShell } from "@/components/phone-shell";
import { parseRoomCode } from "@/lib/board/ids";
import { loadLastRoom } from "@/lib/board/storage";
import { useBoardStore } from "@/lib/board/store";
import { Kanban } from "./kanban";
import { Welcome } from "./welcome";

export function SlipApp({ roomFromUrl }: { roomFromUrl?: string }) {
  const navigate = useNavigate();
  const identity = useBoardStore((s) => s.identity);
  const room = useBoardStore((s) => s.room);
  const boot = useBoardStore((s) => s.boot);
  const setName = useBoardStore((s) => s.setName);
  const createBoard = useBoardStore((s) => s.createBoard);
  const joinBoard = useBoardStore((s) => s.joinBoard);
  const leaveBoard = useBoardStore((s) => s.leaveBoard);

  const [lastRoom, setLastRoom] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    boot();
    const ident = useBoardStore.getState().identity;
    const code = roomFromUrl ? parseRoomCode(roomFromUrl) : null;
    if (ident && code) {
      useBoardStore.getState().joinBoard(code);
    }
    setLastRoom(loadLastRoom());
  }, [boot, roomFromUrl]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);

  function goToRoom(code: string) {
    void navigate({ to: "/", search: { room: code } });
  }

  return (
    <PhoneShell>
      <div className="relative flex h-full min-h-0 flex-col">
        {!identity || !room ? (
          <Welcome
            defaultName={identity?.name ?? ""}
            lastRoom={lastRoom}
            pendingRoom={roomFromUrl ? parseRoomCode(roomFromUrl) : null}
            onCreate={(nextName) => {
              setName(nextName);
              const code = createBoard();
              goToRoom(code);
            }}
            onJoin={(nextName, code) => {
              setName(nextName);
              joinBoard(code);
              goToRoom(code);
            }}
          />
        ) : (
          <Kanban
            key={`${room}:${identity.name}`}
            room={room}
            name={identity.name}
            onRename={(next) => setName(next)}
            onLeave={() => {
              leaveBoard();
              setLastRoom(null);
              void navigate({ to: "/", search: { room: undefined } });
            }}
            onNotify={setToast}
          />
        )}

        <div
          className={`pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center transition-opacity duration-200 ${
            toast ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="rounded-full bg-elevated px-4 py-2 text-sm text-fg shadow-[var(--shadow-card)]">
            {toast ?? ""}
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}
