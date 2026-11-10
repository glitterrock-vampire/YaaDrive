import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { isEmailConfigured, sendVerificationEmail } from '../email.js';
import { HttpError, parse, requireAuth, signToken } from '../http.js';

const router = Router();

const registerSchema = z.object({
  accountType: z.enum(['renter', 'host']),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  phone: z.string().trim().min(7).max(30).regex(/^[+0-9(). -]+$/, 'Enter a valid phone number'),
  parish: z.enum([
    'Clarendon', 'Hanover', 'Kingston', 'Manchester', 'Portland', 'Saint Andrew', 'Saint Ann',
    'Saint Catherine', 'Saint Elizabeth', 'Saint James', 'Saint Mary', 'Saint Thomas', 'Trelawny', 'Westmoreland',
  ]).optional().or(z.literal('')),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  phone: z.string().trim().min(7).max(30).regex(/^[+0-9(). -]+$/, 'Enter a valid phone number'),
  parish: z.enum([
    'Clarendon', 'Hanover', 'Kingston', 'Manchester', 'Portland', 'Saint Andrew', 'Saint Ann',
    'Saint Catherine', 'Saint Elizabeth', 'Saint James', 'Saint Mary', 'Saint Thomas', 'Trelawny', 'Westmoreland',
  ]).optional().or(z.literal('')),
});

const accountTypeSchema = z.object({
  accountType: z.enum(['renter', 'host']),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const verificationSchema = z.object({
  token: z.string().min(32).max(200),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
});

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  parish: u.parish,
  accountType: u.account_type,
  emailVerified: u.email_verified,
  createdAt: u.created_at,
});

router.post('/register', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-up attempts. Please try again later.' },
}), async (req, res) => {
  if (!isEmailConfigured()) {
    throw new HttpError(503, 'Email verification is temporarily unavailable. Please try again later.');
  }
  const { accountType, name, email, password, phone, parish } = parse(registerSchema, req.body);
  const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existing.rowCount) throw new HttpError(409, 'An account with this email already exists');

  const hash = await bcrypt.hash(password, 10);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  let user;
  try {
    user = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, phone, parish, account_type, email_verified)
         VALUES ($1, $2, $3, $4, $5, $6, false) RETURNING *`,
        [name, email, hash, phone, parish || null, accountType],
      );
      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, now() + interval '24 hours')`,
        [rows[0].id, tokenHash],
      );
      return rows[0];
    });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw error;
  }

  let emailSent = true;
  try {
    await sendVerificationEmail({ email, name, token });
  } catch (error) {
    emailSent = false;
    console.error('Failed to send signup verification email:', error);
  }
  res.status(201).json({
    email,
    emailSent,
    message: emailSent
      ? 'Check your email for a link to verify your account.'
      : 'Your account was created, but the verification email could not be sent. Please try resending it.',
  });
});

router.post('/verify-email', async (req, res) => {
  const { token } = parse(verificationSchema, req.body);
  const tokenHash = hashToken(token);
  const user = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT users.id, users.email
       FROM email_verification_tokens
       JOIN users ON users.id = email_verification_tokens.user_id
       WHERE email_verification_tokens.token_hash = $1
         AND email_verification_tokens.expires_at > now()
       FOR UPDATE OF users`,
      [tokenHash],
    );
    if (!rows[0]) return null;
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [rows[0].id]);
    await client.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [rows[0].id]);
    return rows[0];
  });
  if (!user) throw new HttpError(400, 'This verification link is invalid or has expired. Request a new one to continue.');
  res.json({ message: 'Your email is verified. You can now sign in.' });
});

router.post('/verify-email/resend', rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification requests. Please try again later.' },
}), async (req, res) => {
  if (!isEmailConfigured()) {
    throw new HttpError(503, 'Email verification is temporarily unavailable. Please try again later.');
  }
  const { email } = parse(resendVerificationSchema, req.body);
  const genericResponse = {
    message: 'If this address has a pending account, a verification email will be sent.',
  };
  const { rows } = await query(
    `SELECT users.id, users.name, users.email
     FROM users
     LEFT JOIN email_verification_tokens ON email_verification_tokens.user_id = users.id
     WHERE users.email = $1 AND users.email_verified = false`,
    [email],
  );
  const user = rows[0];
  if (!user) return res.json(genericResponse);

  const token = randomBytes(32).toString('base64url');
  await query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + interval '24 hours')
     ON CONFLICT (user_id) DO UPDATE
       SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = now()`,
    [user.id, hashToken(token)],
  );
  try {
    await sendVerificationEmail({ email: user.email, name: user.name, token });
  } catch (error) {
    console.error('Failed to resend signup verification email:', error);
    throw new HttpError(503, 'The verification email could not be sent. Please try again later.');
  }
  res.json(genericResponse);
});

router.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  // Same message for unknown email and wrong password.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password');
  }
  if (!user.email_verified) {
    throw new HttpError(403, 'Please verify your email before signing in. Check your inbox or request a new verification email.');
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(rows[0]) });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, email, phone, parish } = parse(profileSchema, req.body);
  try {
    const { rows } = await query(
      `UPDATE users SET name = $2, email = $3, phone = $4, parish = $5
       WHERE id = $1 RETURNING *`,
      [req.userId, name, email, phone, parish || null],
    );
    if (!rows[0]) throw new HttpError(401, 'Account no longer exists');
    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw err;
  }
});

router.patch('/account-type', requireAuth, async (req, res) => {
  const { accountType } = parse(accountTypeSchema, req.body);
  const { rows } = await query(
    'UPDATE users SET account_type = $2 WHERE id = $1 RETURNING *',
    [req.userId, accountType],
  );
  if (!rows[0]) throw new HttpError(401, 'Account no longer exists');
  res.json({ user: publicUser(rows[0]) });
});

export default router;

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
