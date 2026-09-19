const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function parseRoomCode(input: string): string | null {
  const trimmed = input.trim();
  const fromUrl = trimmed.match(/[?&]room=([A-Za-z0-9]{6})/);
  if (fromUrl) return fromUrl[1]!.toUpperCase();
  const code = trimmed.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length === 6) return code;
  return null;
}

export function isRoomCode(value: string): boolean {
  return /^[A-Z0-9]{6}$/.test(value);
}
