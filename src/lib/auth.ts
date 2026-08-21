// Web Crypto, not Node's `crypto` — needs to run in Edge middleware too

const COOKIE_NAME = "hofh_session";
const SESSION_VALUE = "authenticated";

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(value: string): Promise<string> {
  const secret = process.env.AUTH_SECRET!;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return toHex(signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function sign(value: string): Promise<string> {
  const signature = await hmac(value);
  return `${value}.${signature}`;
}

async function verify(token: string): Promise<boolean> {
  if (!process.env.AUTH_SECRET) return false;
  const [value, signature] = token.split(".");
  if (!value || !signature) return false;
  const expected = await hmac(value);
  return value === SESSION_VALUE && timingSafeEqual(signature, expected);
}

export const authCookie = {
  name: COOKIE_NAME,
  createValue(): Promise<string> {
    return sign(SESSION_VALUE);
  },
  isValid(token: string | undefined): Promise<boolean> {
    if (!token) return Promise.resolve(false);
    return verify(token);
  },
};
