import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Plus, Share, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardsInColumn, visibleCount } from "@/lib/board/merge";
import { useBoardStore } from "@/lib/board/store";
import { COLUMNS, COLUMN_INDEX, isColumnId, type Card, type ColumnId } from "@/lib/board/types";
import { livePeers, useBoardSync } from "@/lib/board/use-sync";
import { cn } from "@/lib/utils";
import { CardFace } from "./card-face";
import { EditorSheet, type EditorState } from "./editor";
import { PeopleSheet } from "./people-sheet";

type DragState = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  offsetX: number;
  offsetY: number;
  overColumn: ColumnId;
  insertIndex: number;
  tilt: number;
};

const LONG_PRESS_MS = 210;
const MOVE_CANCEL_PX = 12;

export function Kanban({
  room,
  name,
  onRename,
  onLeave,
  onNotify,
}: {
  room: string;
  name: string;
  onRename: (name: string) => void;
  onLeave: () => void;
  onNotify: (message: string) => void;
}) {
  const identity = useBoardStore((s) => s.identity) ?? { id: "local", name };
  const { p2p, publish, pending, rows } = useBoardSync(room, identity);
  const cards = useBoardStore((s) => s.cards);
  const activeColumn = useBoardStore((s) => s.activeColumn);
  const setActiveColumn = useBoardStore((s) => s.setActiveColumn);
  const upsertCard = useBoardStore((s) => s.upsertCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const moveCard = useBoardStore((s) => s.moveCard);

  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pressRef = useRef<{
    id: string;
    pointerId: number;
    x: number;
    y: number;
    timer: number;
  } | null>(null);
  const lastXRef = useRef(0);
  const hoverColTimer = useRef<number | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [blockFab, setBlockFab] = useState(false);

  useEffect(() => {
    if (editor) {
      setBlockFab(true);
      return;
    }
    const t = window.setTimeout(() => setBlockFab(false), 320);
    return () => window.clearTimeout(t);
  }, [editor]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    if (!drag) return;
    const previous = document.body.style.touchAction;
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.touchAction = previous;
    };
  }, [drag]);

  const connected = livePeers(p2p.peers);

  const publishMove = useCallback(
    (id: string, column: ColumnId, index: number) => {
      const touched = moveCard(id, column, index);
      for (const card of touched) publish(card);
    },
    [moveCard, publish],
  );

  const hitTest = useCallback(
    (clientX: number, clientY: number, cardId: string): Pick<DragState, "overColumn" | "insertIndex"> => {
      const stack = document.elementsFromPoint(clientX, clientY);
      let overColumn = useBoardStore.getState().activeColumn;
      for (const el of stack) {
        if (!(el instanceof HTMLElement)) continue;
        const col = el.dataset.dropCol;
        if (col && isColumnId(col)) {
          overColumn = col;
          break;
        }
      }
      const nodes = listRef.current?.querySelectorAll<HTMLElement>("[data-card-id]");
      let insertIndex = cardsInColumn(useBoardStore.getState().cards, overColumn).filter(
        (c) => c.id !== cardId,
      ).length;
      if (overColumn === useBoardStore.getState().activeColumn && nodes) {
        let seen = 0;
        let found = insertIndex;
        nodes.forEach((node) => {
          if (node.dataset.cardId === cardId) return;
          const r = node.getBoundingClientRect();
          if (clientY < r.top + r.height / 2) {
            found = Math.min(found, seen);
          }
          seen += 1;
        });
        insertIndex = found;
      }
      return { overColumn, insertIndex };
    },
    [],
  );

  const endPress = () => {
    if (pressRef.current) {
      window.clearTimeout(pressRef.current.timer);
      pressRef.current = null;
    }
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      if (press && !dragRef.current) {
        const dx = e.clientX - press.x;
        const dy = e.clientY - press.y;
        if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) endPress();
        return;
      }
      const current = dragRef.current;
      if (!current) return;
      e.preventDefault();
      const root = rootRef.current?.getBoundingClientRect();
      if (!root) return;
      const x = e.clientX - root.left;
      const y = e.clientY - root.top;
      const tilt = Math.max(-7, Math.min(7, (e.clientX - lastXRef.current) * 1.4));
      lastXRef.current = e.clientX;
      const hit = hitTest(e.clientX, e.clientY, current.id);
      if (hit.overColumn !== current.overColumn) {
        navigator.vibrate?.(8);
        if (hoverColTimer.current) window.clearTimeout(hoverColTimer.current);
        const target = hit.overColumn;
        hoverColTimer.current = window.setTimeout(() => {
          if (dragRef.current) setActiveColumn(target);
        }, 380);
      }
      setDrag({
        ...current,
        x,
        y,
        tilt,
        overColumn: hit.overColumn,
        insertIndex: hit.insertIndex,
      });
    },
    [hitTest, setActiveColumn],
  );

  const onPointerUp = useCallback(
    (e: PointerEvent) => {
      const press = pressRef.current;
      const current = dragRef.current;
      endPress();
      if (hoverColTimer.current) {
        window.clearTimeout(hoverColTimer.current);
        hoverColTimer.current = null;
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (current) {
        publishMove(current.id, current.overColumn, current.insertIndex);
        if (current.overColumn !== useBoardStore.getState().activeColumn) {
          setActiveColumn(current.overColumn);
        }
        setDrag(null);
        return;
      }
      if (press && press.pointerId === e.pointerId) {
        const dx = e.clientX - press.x;
        const dy = e.clientY - press.y;
        if (Math.hypot(dx, dy) < MOVE_CANCEL_PX) {
          const card = useBoardStore.getState().cards[press.id];
          if (card && !card.deleted) setEditor({ mode: "edit", card });
        }
      }
    },
    [onPointerMove, publishMove, setActiveColumn],
  );

  function startPress(card: Card, e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    const root = rootRef.current?.getBoundingClientRect();
    const rect = e.currentTarget.getBoundingClientRect();
    if (!root) return;
    const pointerId = e.pointerId;
    const x = e.clientX;
    const y = e.clientY;
    pressRef.current = {
      id: card.id,
      pointerId,
      x,
      y,
      timer: window.setTimeout(() => {
        pressRef.current = null;
        navigator.vibrate?.(12);
        lastXRef.current = x;
        const hit = hitTest(x, y, card.id);
        setDrag({
          id: card.id,
          x: x - root.left,
          y: y - root.top,
          w: rect.width,
          h: rect.height,
          offsetX: x - rect.left,
          offsetY: y - rect.top,
          tilt: 0,
          ...hit,
        });
      }, LONG_PRESS_MS),
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onLanePointerDown(e: ReactPointerEvent) {
    if (drag) return;
    swipeRef.current = { x: e.clientX, y: e.clientY };
  }

  function onLanePointerUp(e: ReactPointerEvent) {
    const swipe = swipeRef.current;
    swipeRef.current = null;
    if (!swipe || dragRef.current) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    const idx = COLUMN_INDEX[activeColumn];
    if (dx < 0 && idx < 2) setActiveColumn(COLUMNS[idx + 1]!.id);
    if (dx > 0 && idx > 0) setActiveColumn(COLUMNS[idx - 1]!.id);
  }

  async function shareRoom() {
    const url = `${window.location.origin}/?room=${room}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my Slip board", text: `Room ${room}`, url });
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      onNotify("Invite link copied");
    } catch {
      onNotify(`Room ${room}`);
    }
  }

  const list = cardsInColumn(cards, activeColumn);
  const draggingCard = drag ? cards[drag.id] : null;
  const liveCount = connected.length;
  const tabIndex = COLUMN_INDEX[activeColumn];
  const visibleWithoutDrag = list.filter((c) => c.id !== drag?.id);

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-3 px-5 pt-2 pb-3">
        <div className="min-w-0">
          <p className="text-caption font-medium uppercase tracking-[0.14em] text-muted">Slip</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{room}</h1>
          <p className="mt-0.5 text-caption text-muted">
            {pending > 0 && liveCount === 0
              ? "Saved here · waiting to sync"
              : liveCount === 0
                ? p2p.joined
                  ? "Just you · invite someone"
                  : "Connecting"
                : `${liveCount} live · peer sync on`}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Share board" onClick={() => void shareRoom()}>
            <Share className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="People and settings"
            onClick={() => {
              setDraftName(name);
              setPeopleOpen(true);
            }}
          >
            <Users className="size-5" />
          </Button>
        </div>
      </header>

      <div className="px-5 pb-3">
        <div className="relative grid grid-cols-3 rounded-lg bg-elevated p-1">
          <span
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-1 w-[calc((100%-8px)/3)] rounded-md bg-card shadow-[var(--shadow-card)] transition-transform duration-200 ease-[var(--ease-out)]"
            style={{ transform: `translateX(${tabIndex * 100}%)` }}
          />
          {COLUMNS.map((col) => {
            const count = visibleCount(cards, col.id);
            const active = col.id === activeColumn;
            const dropHot = drag?.overColumn === col.id;
            return (
              <button
                key={col.id}
                type="button"
                data-drop-col={col.id}
                onClick={() => setActiveColumn(col.id)}
                className={cn(
                  "relative z-10 flex h-11 flex-col items-center justify-center rounded-md text-caption font-medium",
                  active ? "text-fg" : "text-muted",
                  dropHot && "text-accent",
                )}
              >
                <span>{col.label}</span>
                <span className="tabular-nums text-subtle">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onPointerDown={onLanePointerDown}
        onPointerUp={onLanePointerUp}
      >
        <div
          className="flex h-full transition-transform duration-300 ease-[var(--ease-out)]"
          style={{ width: "300%", transform: `translateX(-${tabIndex * 33.3333}%)` }}
        >
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex h-full w-1/3 min-w-0 flex-col" data-drop-col={col.id}>
              {col.id === activeColumn ? (
                <div
                  ref={listRef}
                  className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-5 pb-28"
                >
                  {list.length === 0 && !drag ? (
                    <EmptyColumn column={col.id} onAdd={() => setEditor({ mode: "create", column: col.id })} />
                  ) : null}
                  {list.map((card, index) => {
                    const hidden = drag?.id === card.id;
                    const showGap = Boolean(
                      drag &&
                        drag.overColumn === activeColumn &&
                        drag.id !== card.id &&
                        drag.insertIndex === index,
                    );
                    return (
                      <div key={card.id}>
                        {showGap ? <DropLine /> : null}
                        <button
                          type="button"
                          data-card-id={card.id}
                          aria-label={`Card ${card.title}. Long press to move.`}
                          onPointerDown={(e) => startPress(card, e)}
                          className={cn(
                            "block w-full text-left transition-opacity duration-150",
                            hidden ? "opacity-0" : "opacity-100",
                          )}
                        >
                          <CardFace card={card} authorName={card.authorName || name} />
                        </button>
                      </div>
                    );
                  })}
                  {drag &&
                  drag.overColumn === activeColumn &&
                  drag.insertIndex >= visibleWithoutDrag.length ? (
                    <DropLine />
                  ) : null}
                </div>
              ) : (
                <div className="h-full" />
              )}
            </div>
          ))}
        </div>
      </div>

      {drag && draggingCard ? (
        <div
          className="pointer-events-none absolute z-40 will-change-transform"
          style={{
            width: drag.w,
            transform: `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0) rotate(${drag.tilt}deg) scale(1.04)`,
          }}
        >
          <CardFace card={draggingCard} lifted authorName={draggingCard.authorName || name} />
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 px-4 pb-5 transition-transform duration-200 ease-[var(--ease-out)]",
          drag ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-elevated/95 p-1.5 shadow-[var(--shadow-lift)]">
          {COLUMNS.map((col) => {
            const hot = drag?.overColumn === col.id;
            return (
              <div
                key={col.id}
                data-drop-col={col.id}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-lg text-caption font-medium transition-colors duration-150",
                  hot ? "bg-accent text-accent-fg" : "bg-card text-muted",
                )}
              >
                <span>{col.label}</span>
                <span className="tabular-nums opacity-80">{visibleCount(cards, col.id)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        aria-label="Add card"
        onClick={() => setEditor({ mode: "create", column: activeColumn })}
        className={cn(
          "absolute right-5 bottom-6 z-10 flex size-14 items-center justify-center rounded-full bg-fg text-bg shadow-[var(--shadow-lift)]",
          "transition-[transform,opacity] duration-150 ease-[var(--ease-snappy)] active:scale-[0.96]",
          drag || editor || peopleOpen || blockFab ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <Plus className="size-6" />
      </button>

      <EditorSheet
        state={editor}
        onClose={() => setEditor(null)}
        onSave={(input) => {
          const card = upsertCard(input);
          setEditor(null);
          if (card) publish(card);
        }}
        onDelete={(id) => {
          const card = deleteCard(id);
          setEditor(null);
          if (card) publish(card);
        }}
      />

      <PeopleSheet
        open={peopleOpen}
        room={room}
        draftName={draftName}
        rows={rows}
        onDraftName={setDraftName}
        onSaveName={() => {
          onRename(draftName);
          onNotify("Name updated");
        }}
        onShare={() => void shareRoom()}
        onLeave={onLeave}
        onClose={() => setPeopleOpen(false)}
      />
    </div>
  );
}

function DropLine() {
  return <div className="mx-1 h-1 rounded-full bg-accent" aria-hidden="true" />;
}

function EmptyColumn({ column, onAdd }: { column: ColumnId; onAdd: () => void }) {
  const label = COLUMNS.find((c) => c.id === column)?.label ?? column;
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-base font-medium text-fg">Nothing in {label}</p>
      <p className="mt-1 max-w-[22ch] text-sm leading-normal text-muted">
        Add a card, or drag one here from another lane.
      </p>
      <button type="button" onClick={onAdd} className="mt-5 h-11 px-4 text-sm font-medium text-accent">
        Add a card
      </button>
    </div>
  );
}
