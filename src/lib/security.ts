// Lightweight client-side security primitives:
// - input sanitization (XSS / control char strip + length cap)
// - login attempt rate limiting (per-device, localStorage)
// - CONFIRM gate helper

const RATE_KEY = "sams_login_attempts_v1";
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;

export function sanitizeText(value: unknown, maxLen = 200): string {
  if (value == null) return "";
  let s = String(value);
  // remove control chars
  s = s.replace(/[\u0000-\u001F\u007F]/g, "");
  // strip angle brackets to neutralize XSS payloads when rendered
  s = s.replace(/[<>]/g, "");
  // collapse excessive whitespace
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeUsername(value: unknown): string {
  // allow latin/cyrillic letters, digits, underscore, dash, dot
  const s = sanitizeText(value, 64);
  return s.replace(/[^A-Za-z0-9А-Яа-яЁёҲҳҶҷҒғӮӯҚқЙйІі._-]/g, "");
}

export function sanitizePrefix(value: unknown): string {
  // school prefix used in student IDs — letters/digits only, uppercased
  const s = sanitizeText(value, 12).replace(/\s+/g, "");
  return s.replace(/[^A-Za-zА-Яа-яЁёҲҳҶҷҒғӮӯҚқ0-9]/g, "").toUpperCase();
}

interface AttemptRecord { ts: number[] }

function readAttempts(): AttemptRecord {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return { ts: [] };
    const parsed = JSON.parse(raw) as AttemptRecord;
    return { ts: Array.isArray(parsed?.ts) ? parsed.ts : [] };
  } catch { return { ts: [] }; }
}

function writeAttempts(rec: AttemptRecord) {
  localStorage.setItem(RATE_KEY, JSON.stringify(rec));
}

export interface RateState {
  allowed: boolean;
  remaining: number;
  retryInSec: number;
}

export function checkLoginRate(): RateState {
  const now = Date.now();
  const rec = readAttempts();
  const recent = rec.ts.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = Math.min(...recent);
    return { allowed: false, remaining: 0, retryInSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  return { allowed: true, remaining: MAX_ATTEMPTS - recent.length, retryInSec: 0 };
}

export function recordLoginAttempt() {
  const now = Date.now();
  const rec = readAttempts();
  const recent = rec.ts.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  writeAttempts({ ts: recent });
}

export function clearLoginAttempts() {
  writeAttempts({ ts: [] });
}

export const CONFIRM_TOKEN = "CONFIRM";
export function isConfirmed(value: string): boolean {
  return value === CONFIRM_TOKEN;
}
