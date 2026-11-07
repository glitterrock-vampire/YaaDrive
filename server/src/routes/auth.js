import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
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

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  parish: u.parish,
  accountType: u.account_type,
  createdAt: u.created_at,
});

router.post('/register', async (req, res) => {
  const { accountType, name, email, password, phone, parish } = parse(registerSchema, req.body);
  const existing = await query('SELECT 1 FROM users WHERE email = $1', [email]);
  if (existing.rowCount) throw new HttpError(409, 'An account with this email already exists');

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    'INSERT INTO users (name, email, password_hash, phone, parish, account_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [name, email, hash, phone, parish || null, accountType],
  );
  res.status(201).json({ token: signToken(rows[0].id), user: publicUser(rows[0]) });
});

router.post('/login', async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  // Same message for unknown email and wrong password.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, 'Incorrect email or password');
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
