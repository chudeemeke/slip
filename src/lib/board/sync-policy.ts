/**
 * Only an established incumbent sends the board snapshot.
 * A newcomer with an empty (or stale-unestablished) board must not.
 */
export function shouldOfferSnapshot(
  selfId: string,
  previouslyConnected: string[],
  localCardCount: number,
): boolean {
  const established = previouslyConnected.length > 0 || localCardCount > 0;
  if (!established) return false;
  const host = [...previouslyConnected, selfId].sort()[0];
  return host === selfId;
}
