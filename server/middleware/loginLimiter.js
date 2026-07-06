// In-memory lockout for the login endpoint. Since the app now allows the
// assistant to run arbitrary commands on this laptop, brute-forcing the PIN
// is equivalent to brute-forcing full remote access — this slows that down.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

const attemptsByIp = new Map();

export function loginLimiter(req, res, next) {
  const ip = req.ip;
  const entry = attemptsByIp.get(ip);
  const now = Date.now();

  if (entry && entry.lockedUntil > now) {
    const secondsLeft = Math.ceil((entry.lockedUntil - now) / 1000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${secondsLeft}s.` });
  }

  next();
}

export function recordFailedLogin(req) {
  const ip = req.ip;
  const now = Date.now();
  const entry = attemptsByIp.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
    entry.count = 0;
  }
  attemptsByIp.set(ip, entry);
}

export function clearFailedLogins(req) {
  attemptsByIp.delete(req.ip);
}
