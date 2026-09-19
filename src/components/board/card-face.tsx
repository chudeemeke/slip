import { cn } from "@/lib/utils";
import { avatarTone, initials } from "@/lib/board/avatar";
import type { Card } from "@/lib/board/types";

function compactTime(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${Math.max(1, Math.round(s / 3600))}h`;
  return `${Math.max(1, Math.round(s / 86400))}d`;
}

export function CardFace({
  card,
  lifted,
  authorName,
}: {
  card: Card;
  lifted?: boolean;
  authorName?: string;
}) {
  return (
    <article
      className={cn(
        "rounded-lg bg-card px-4 py-3.5 shadow-[var(--shadow-card)]",
        lifted && "shadow-[var(--shadow-lift)]",
      )}
    >
      <h3 className="text-callout font-semibold leading-snug tracking-tight text-fg">{card.title}</h3>
      {card.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-normal text-muted">{card.description}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-caption text-subtle">
        <span
          className="flex size-6 items-center justify-center rounded-full text-caption font-semibold text-fg"
          style={{ background: avatarTone(card.authorId) }}
          aria-hidden="true"
        >
          {initials(authorName ?? "You")}
        </span>
        <span className="tabular-nums">{compactTime(card.updatedAt)}</span>
      </div>
    </article>
  );
}
