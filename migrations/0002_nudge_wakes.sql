-- Wake-ups for lock-screen morning nudges. No names, titles, or room codes —
-- just a push endpoint and a time.
create table if not exists vapid_keys (
  id integer primary key,
  public_key text not null,
  private_key text not null
);

create table if not exists nudge_wakes (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  wake_at bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists nudge_wakes_due on nudge_wakes (wake_at);
