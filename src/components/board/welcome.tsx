import { useEffect, useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRoomCode } from "@/lib/board/ids";
import { cn } from "@/lib/utils";

export function Welcome({
  defaultName,
  lastRoom,
  pendingRoom,
  onCreate,
  onJoin,
}: {
  defaultName: string;
  lastRoom: string | null;
  pendingRoom: string | null;
  onCreate: (name: string) => void;
  onJoin: (name: string, code: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(pendingRoom ?? "");
  const [joining, setJoining] = useState(Boolean(pendingRoom));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultName && !name) setName(defaultName);
  }, [defaultName, name]);

  useEffect(() => {
    if (pendingRoom) {
      setCode(pendingRoom);
      setJoining(true);
    }
  }, [pendingRoom]);

  const readyName = name.trim().length > 0;

  function submitJoin() {
    const parsed = parseRoomCode(code);
    if (!parsed) {
      setError("Enter a 6-character room code");
      return;
    }
    if (!readyName) {
      setError("Add your name first");
      return;
    }
    onJoin(name, parsed);
  }

  return (
    <div className="flex h-full flex-col px-6 pb-5 pt-8">
      <div className="flex flex-1 flex-col justify-center gap-7">
        <LaneMark />
        <div className="space-y-2">
          <p className="text-caption font-medium uppercase tracking-[0.16em] text-muted">Pocket kanban</p>
          <h1 className="text-4xl font-semibold tracking-tight text-fg">Slip</h1>
          <p className="max-w-[24ch] text-base leading-normal text-muted">
            Three lanes. Cards that move with you — and anyone you invite.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="display-name">Your name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex"
            autoComplete="nickname"
            maxLength={24}
          />
        </div>

        {joining ? (
          <div className="space-y-2">
            <Label htmlFor="room-code">Room code</Label>
            <Input
              id="room-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="K7MQ2P"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={64}
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        {joining ? (
          <Button variant="accent" disabled={!readyName} onClick={submitJoin}>
            Join board
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button variant="accent" disabled={!readyName} onClick={() => onCreate(name)}>
            Start a board
            <ArrowRight className="size-4" />
          </Button>
        )}

        <div className="flex flex-col">
          <button
            type="button"
            className={cn(
              "flex h-11 items-center justify-center gap-2 text-sm font-medium text-muted",
              "transition-colors duration-150 hover:text-fg",
            )}
            onClick={() => {
              setJoining((v) => !v);
              setError(null);
            }}
          >
            <Link2 className="size-4" />
            {joining ? "Start a new board instead" : "Join with a code"}
          </button>
          {lastRoom && !joining ? (
            <button
              type="button"
              className="flex h-11 items-center justify-center text-sm font-medium text-accent"
              onClick={() => onJoin(name, lastRoom)}
              disabled={!readyName}
            >
              Reopen {lastRoom}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LaneMark() {
  return (
    <div className="flex w-28 gap-1.5" aria-hidden="true">
      <span className="h-16 flex-1 rounded-md bg-elevated shadow-[var(--shadow-card)]" />
      <span className="mt-3 h-16 flex-1 rounded-md bg-card shadow-[var(--shadow-card)]" />
      <span className="mt-6 h-16 flex-1 rounded-md bg-accent/80" />
    </div>
  );
}
