export const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "doing", label: "Doing" },
  { id: "done", label: "Done" },
] as const;

export type ColumnId = (typeof COLUMNS)[number]["id"];

export type Card = {
  id: string;
  title: string;
  description: string;
  column: ColumnId;
  rank: number;
  updatedAt: number;
  laneAt: number;
  deleted: boolean;
  authorId: string;
  authorName: string;
  nudgeAt: number | null;
  nudgeColumn: ColumnId | null;
};

export type Identity = {
  id: string;
  name: string;
};

export type PeerMsg =
  | { t: "snap"; cards: Card[] }
  | { t: "put"; card: Card }
  | { t: "hello"; identity: Identity };

export const COLUMN_INDEX: Record<ColumnId, number> = {
  todo: 0,
  doing: 1,
  done: 2,
};

export function isColumnId(value: string): value is ColumnId {
  return value === "todo" || value === "doing" || value === "done";
}
