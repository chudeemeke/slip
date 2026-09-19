import { Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { avatarTone, initials } from "@/lib/board/avatar";
import type { PresenceRow } from "@/lib/board/presence";
import { cn } from "@/lib/utils";
import { Sheet } from "./sheet";

export function PeopleSheet({
  open,
  room,
  draftName,
  rows,
  onDraftName,
  onSaveName,
  onShare,
  onLeave,
  onClose,
}: {
  open: boolean;
  room: string;
  draftName: string;
  rows: PresenceRow[];
  onDraftName: (name: string) => void;
  onSaveName: () => void;
  onShare: () => void;
  onLeave: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="people-title">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-6 pt-2">
        <h2 id="people-title" className="text-xl font-semibold tracking-tight">
          Room {room}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="rename">Your name</Label>
          <div className="flex gap-2">
            <Input
              id="rename"
              value={draftName}
              maxLength={24}
              onChange={(e) => onDraftName(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={!draftName.trim()}
              onClick={onSaveName}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-caption font-medium text-muted">On this board</p>
          <ul className="divide-y divide-border rounded-lg bg-elevated px-1">
            {rows.map((row) => (
              <PeerRow
                key={row.key}
                name={row.name}
                you={row.you}
                status={row.status}
                rtt={row.rtt}
              />
            ))}
          </ul>
        </div>

        <Button variant="outline" onClick={onShare}>
          <Share className="size-4" />
          Share invite
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            onClose();
            onLeave();
          }}
        >
          Leave board
        </Button>
      </div>
    </Sheet>
  );
}

function PeerRow({
  name,
  you,
  status,
  rtt,
}: {
  name: string;
  you?: boolean;
  status: string;
  rtt?: number | null;
}) {
  const live = status === "connected";
  const failed = status === "failed" || status === "closed";
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <span
        className="flex size-9 items-center justify-center rounded-full text-caption font-semibold text-fg"
        style={{ background: avatarTone(name) }}
      >
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name}
          {you ? <span className="text-muted"> · you</span> : null}
        </p>
        <p className="text-caption text-subtle">
          {you
            ? "This device"
            : live
              ? rtt != null
                ? `${rtt}ms`
                : "Connected"
              : failed
                ? "Can't reach"
                : "Connecting"}
        </p>
      </div>
      <span
        className={cn(
          "size-2 rounded-full",
          live || you ? "bg-accent" : failed ? "bg-danger" : "bg-subtle",
        )}
        aria-hidden="true"
      />
    </li>
  );
}
