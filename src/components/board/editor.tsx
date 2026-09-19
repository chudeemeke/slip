import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COLUMNS, type Card, type ColumnId } from "@/lib/board/types";
import { cn } from "@/lib/utils";
import { Sheet } from "./sheet";

export type EditorState =
  | { mode: "create"; column: ColumnId }
  | { mode: "edit"; card: Card }
  | null;

export function EditorSheet({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: EditorState;
  onClose: () => void;
  onSave: (input: {
    id?: string;
    title: string;
    description: string;
    column: ColumnId;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const open = state !== null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [column, setColumn] = useState<ColumnId>("todo");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.mode === "edit") {
      setTitle(state.card.title);
      setDescription(state.card.description);
      setColumn(state.card.column);
    } else {
      setTitle("");
      setDescription("");
      setColumn(state.column);
    }
    setConfirmDelete(false);
  }, [state]);

  const canSave = title.trim().length > 0;

  return (
    <Sheet open={open} onClose={onClose} labelledBy="card-editor-title">
      <form
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-6 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave || !state) return;
          onSave({
            id: state.mode === "edit" ? state.card.id : undefined,
            title,
            description,
            column,
          });
        }}
      >
        <h2 id="card-editor-title" className="text-xl font-semibold tracking-tight">
          {state?.mode === "edit" ? "Edit card" : "New card"}
        </h2>

        <div className="space-y-2">
          <Label htmlFor="card-title">Title</Label>
          <Input
            id="card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="card-desc">Description</Label>
          <Textarea
            id="card-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional notes"
          />
        </div>

        <div className="space-y-2">
          <Label>Column</Label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-elevated p-1">
            {COLUMNS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setColumn(col.id)}
                className={cn(
                  "h-10 rounded-md text-sm font-medium transition-colors duration-150",
                  column === col.id ? "bg-card text-fg shadow-[var(--shadow-card)]" : "text-muted",
                )}
              >
                {col.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button type="submit" variant="accent" disabled={!canSave}>
            {state?.mode === "edit" ? "Save changes" : "Add to board"}
          </Button>
          {state?.mode === "edit" ? (
            confirmDelete ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => onDelete(state.card.id)}
              >
                Confirm delete
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" />
                Delete card
              </Button>
            )
          ) : null}
        </div>
      </form>
    </Sheet>
  );
}
