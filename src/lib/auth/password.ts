const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

// btoa/atob (not Buffer) so this works unmodified on Workers without the
// Node compat flag.
function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return new Uint8Array(bits);
}

// Uses Web Crypto (crypto.subtle) rather than Node's `crypto` module so this
// runs unmodified on Cloudflare Workers once the backend moves there.
export async function hashPassword(password: string): Promise<string> {
  const saltBytes: Uint8Array<ArrayBuffer> = new Uint8Array(SALT_BYTES);
  const salt = crypto.getRandomValues(saltBytes);
  const derived = await deriveBits(password, salt);
  return `${toBase64(salt)}:${toBase64(derived)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;

  const salt = fromBase64(saltB64);
  const expected = fromBase64(hashB64);
  const actual = await deriveBits(password, salt);

  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual[i] ^ expected[i];
  }
  return diff === 0;
}
