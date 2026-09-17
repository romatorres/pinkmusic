const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

const loginAttempts = new Map<string, { count: number; firstAttemptAt: number }>();

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isStrongPassword(value: string): boolean {
  const trimmed = value.trim();

  if (trimmed.length < 8) {
    return false;
  }

  const hasLetter = /[A-Za-z]/.test(trimmed);
  const hasNumber = /\d/.test(trimmed);

  return hasLetter && hasNumber;
}

export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  return forwardedFor?.split(",")[0]?.trim() || realIp || "unknown-client";
}

export function checkRateLimit(request: Request, identifier: string): boolean {
  const key = `${getClientKey(request)}:${identifier}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  if (!attempt) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return true;
  }

  const elapsed = now - attempt.firstAttemptAt;

  if (elapsed > RATE_LIMIT_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAttemptAt: now });
    return true;
  }

  if (attempt.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  loginAttempts.set(key, {
    count: attempt.count + 1,
    firstAttemptAt: attempt.firstAttemptAt,
  });

  return true;
}

export function clearRateLimit(request: Request, identifier: string): void {
  const key = `${getClientKey(request)}:${identifier}`;
  loginAttempts.delete(key);
}
