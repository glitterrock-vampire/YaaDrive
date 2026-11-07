import jwt from 'jsonwebtoken';
import { ZodError } from 'zod';
import { query } from './db.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const isProd = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || (isProd ? null : 'dev-only-secret-do-not-use-in-production');
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

/** Requires a valid Bearer token; sets req.userId. */
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Please sign in to continue'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = Number(payload.sub);
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again'));
  }
}

export function requireAccountType(accountType) {
  return async (req, _res, next) => {
    const { rows } = await query('SELECT account_type FROM users WHERE id = $1', [req.userId]);
    if (!rows[0]) return next(new HttpError(401, 'Account no longer exists'));
    if (rows[0].account_type !== accountType) {
      return next(new HttpError(403, `This action requires a ${accountType === 'host' ? 'Host' : 'Renter'} account`));
    }
    next();
  };
}

/** Parse `data` with a zod schema, throwing a 400 with readable messages. */
export function parse(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) throw result.error;
  return result.data;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`);
    return res.status(400).json({ error: 'Please check the highlighted fields', details });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Image is too large (max 5 MB)' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
}

/** Days between two 'YYYY-MM-DD' strings (end exclusive). */
export function daysBetween(start, end) {
  const [sy, sm, sd] = start.split('-').map(Number);
  const [ey, em, ed] = end.split('-').map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000);
}

/** Today's date as 'YYYY-MM-DD' (UTC). */
export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Read a positive integer `:id` route param or throw 404. */
export function idParam(req, name = 'id') {
  const n = Number(req.params[name]);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(404, 'Not found');
  return n;
}

/** Shift a 'YYYY-MM-DD' date by `n` days. */
export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** True if any date from `start` to `end` inclusive falls on a Saturday or Sunday. */
export function rangeHasWeekend(start, end) {
  const n = daysBetween(start, end);
  const [y, m, d] = start.split('-').map(Number);
  for (let i = 0; i <= n; i++) {
    const dow = new Date(Date.UTC(y, m - 1, d + i)).getUTCDay();
    if (dow === 0 || dow === 6) return true;
  }
  return false;
}
