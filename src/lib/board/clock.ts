/**
 * Hybrid logical clock: comparable numbers that cannot go backwards, even when
 * a peer's wall clock is skewed. Local writes tick; remote writes are observed.
 * Pure memory — persistence is the storage adapter's job.
 */
let logical = 0;

export function hydrateClock(stored: number): void {
  if (Number.isFinite(stored) && stored > logical) logical = stored;
}

export function currentTime(): number {
  return logical;
}

export function observeTime(remote: number, wall = Date.now()): void {
  if (!Number.isFinite(remote)) return;
  logical = Math.max(logical, remote, wall);
}

export function tick(wall = Date.now()): number {
  logical = Math.max(logical + 1, wall);
  return logical;
}

/** Test-only. */
export function resetClock(value = 0): void {
  logical = value;
}
