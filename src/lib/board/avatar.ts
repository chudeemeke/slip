export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

/** Low-chroma tone so avatars distinguish without a second brand palette. */
export function avatarTone(id: string): string {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i) * 17) % 360;
  return `hsl(${n} 14% 38%)`;
}
