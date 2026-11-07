import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db.js';
import { addDays, daysBetween, HttpError, idParam, parse, rangeHasWeekend, requireAccountType, requireAuth, today } from '../http.js';

const router = Router();
router.use(requireAuth);

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

const createSchema = z.object({
  vehicleId: z.coerce.number().int().positive(),
  startDate: dateStr,
  endDate: dateStr,
});

const respondSchema = z.object({ action: z.enum(['accept', 'decline']) });

const paySchema = z.object({
  cardName: z.string().trim().min(2).max(80),
  cardNumber: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .refine((v) => /^\d{13,19}$/.test(v) && luhn(v), 'Enter a valid card number'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY'),
  cvc: z.string().regex(/^\d{3,4}$/, 'Enter the 3 or 4 digit security code'),
});

function luhn(num) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function cardBrand(num) {
  if (/^4/.test(num)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'Mastercard';
  if (/^3[47]/.test(num)) return 'Amex';
  return 'Card';
}

function expired(expiry) {
  const [mm, yy] = expiry.split('/').map(Number);
  const now = new Date();
  const year = 2000 + yy;
  return year < now.getFullYear() || (year === now.getFullYear() && mm < now.getMonth() + 1);
}

const BOOKING_SELECT = `
  SELECT b.*, v.make, v.model, v.year, v.location, v.image_url, v.price_per_day, v.owner_id,
         owner.name AS owner_name, renter.name AS renter_name, renter.email AS renter_email, renter.phone AS renter_phone,
         p.card_brand, p.card_last4,
         COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE reviewee_id = b.renter_id AND role = 'owner'), 0) AS renter_rating,
         EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id AND r.reviewer_id = $1) AS reviewed_by_me
  FROM bookings b
  JOIN vehicles v ON v.id = b.vehicle_id
  JOIN users owner ON owner.id = v.owner_id
  JOIN users renter ON renter.id = b.renter_id
  LEFT JOIN payments p ON p.booking_id = b.id`;

const toBooking = (r, viewerId) => ({
  id: r.id,
  vehicleId: r.vehicle_id,
  vehicle: { make: r.make, model: r.model, year: r.year, location: r.location, imageUrl: r.image_url, pricePerDay: r.price_per_day },
  ownerId: r.owner_id,
  ownerName: r.owner_name,
  renterId: r.renter_id,
  renterName: r.renter_name,
  // Contact details are shared with the owner only once the trip is confirmed.
  renterEmail: viewerId === r.owner_id && ['confirmed', 'completed'].includes(r.status) ? r.renter_email : null,
  renterPhone: viewerId === r.owner_id && ['confirmed', 'completed'].includes(r.status) ? r.renter_phone : null,
  renterRating: r.renter_rating,
  startDate: r.start_date,
  endDate: r.end_date,
  days: daysBetween(r.start_date, r.end_date),
  totalPrice: r.total_price,
  status: r.status,
  paymentStatus: r.payment_status,
  cardBrand: r.card_brand,
  cardLast4: r.card_last4,
  reviewedByMe: r.reviewed_by_me,
  createdAt: r.created_at,
});

async function loadBooking(id, userId) {
  const { rows } = await query(`${BOOKING_SELECT} WHERE b.id = $2`, [userId, id]);
  const b = rows[0];
  if (!b || (b.renter_id !== userId && b.owner_id !== userId)) throw new HttpError(404, 'Booking not found');
  return b;
}

// Request a booking (status: pending until the Host accepts).
router.post('/', requireAccountType('renter'), async (req, res) => {
  const { vehicleId, startDate, endDate } = parse(createSchema, req.body);
  // One day of slack so renters ahead of/behind UTC can still book "today".
  if (startDate < addDays(today(), -1)) throw new HttpError(400, 'Start date cannot be in the past');
  if (endDate <= startDate) throw new HttpError(400, 'End date must be after the start date');
  const days = daysBetween(startDate, endDate);
  if (days > 60) throw new HttpError(400, 'Rentals are limited to 60 days');

  const { rows } = await query('SELECT id, owner_id, price_per_day, active, available_weekends FROM vehicles WHERE id = $1', [vehicleId]);
  const vehicle = rows[0];
  if (!vehicle || !vehicle.active) throw new HttpError(404, 'Vehicle not found');
  if (vehicle.owner_id === req.userId) throw new HttpError(400, 'You cannot rent your own vehicle');

  if (!vehicle.available_weekends && rangeHasWeekend(startDate, endDate)) {
    throw new HttpError(400, 'This vehicle is not available on weekends. Choose weekday dates only');
  }

  const total = Math.round(days * vehicle.price_per_day * 100) / 100;
  try {
    const result = await query(
      `INSERT INTO bookings (vehicle_id, renter_id, start_date, end_date, total_price)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [vehicleId, req.userId, startDate, endDate, total],
    );
    res.status(201).json({ id: result.rows[0].id, totalPrice: total, days });
  } catch (err) {
    if (err.code === '23P01') throw new HttpError(409, 'Sorry, this vehicle is no longer available for those dates');
    throw err;
  }
});

// Trips I have booked as a renter.
router.get('/mine', requireAccountType('renter'), async (req, res) => {
  const { rows } = await query(`${BOOKING_SELECT} WHERE b.renter_id = $1 ORDER BY b.start_date DESC`, [req.userId]);
  res.json({ bookings: rows.map((r) => toBooking(r, req.userId)) });
});

// Requests for vehicles I own.
router.get('/incoming', requireAccountType('host'), async (req, res) => {
  const { rows } = await query(`${BOOKING_SELECT} WHERE v.owner_id = $1 ORDER BY
    CASE b.status WHEN 'pending' THEN 0 WHEN 'confirmed' THEN 1 ELSE 2 END, b.start_date DESC`, [req.userId]);
  res.json({ bookings: rows.map((r) => toBooking(r, req.userId)) });
});

// Host accepts or declines a pending request.
router.post('/:id/respond', requireAccountType('host'), async (req, res) => {
  const id = idParam(req);
  const { action } = parse(respondSchema, req.body);
  const b = await loadBooking(id, req.userId);
  if (b.owner_id !== req.userId) throw new HttpError(403, 'Only the Host can respond to a request');
  if (b.status !== 'pending') throw new HttpError(409, 'This request has already been answered');

  await query('UPDATE bookings SET status = $2 WHERE id = $1', [id, action === 'accept' ? 'confirmed' : 'declined']);
  res.json({ ok: true });
});

// Renter pays for a confirmed booking. Mock gateway: validates the card, stores only brand + last 4.
router.post('/:id/pay', requireAccountType('renter'), async (req, res) => {
  const id = idParam(req);
  const card = parse(paySchema, req.body);
  if (expired(card.expiry)) throw new HttpError(400, 'This card has expired');

  await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    const b = rows[0];
    if (!b || b.renter_id !== req.userId) throw new HttpError(404, 'Booking not found');
    if (b.status !== 'confirmed') throw new HttpError(409, 'You can pay once the Host has accepted your request');
    if (b.payment_status === 'paid') throw new HttpError(409, 'This booking is already paid');

    await client.query(
      `INSERT INTO payments (booking_id, amount, card_brand, card_last4)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id) DO UPDATE SET status = 'succeeded', amount = EXCLUDED.amount,
         card_brand = EXCLUDED.card_brand, card_last4 = EXCLUDED.card_last4, created_at = now()`,
      [id, b.total_price, cardBrand(card.cardNumber), card.cardNumber.slice(-4)],
    );
    await client.query("UPDATE bookings SET payment_status = 'paid' WHERE id = $1", [id]);
  });
  res.json({ ok: true });
});

// Cancel (Renter: pending or confirmed; Host: confirmed). Paid trips are refunded.
router.post('/:id/cancel', async (req, res) => {
  const id = idParam(req);
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT b.*, v.owner_id FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id WHERE b.id = $1 FOR UPDATE OF b`,
      [id],
    );
    const b = rows[0];
    if (!b || (b.renter_id !== req.userId && b.owner_id !== req.userId)) throw new HttpError(404, 'Booking not found');
    const account = await client.query('SELECT account_type FROM users WHERE id = $1', [req.userId]);
    const expectedType = b.renter_id === req.userId ? 'renter' : 'host';
    if (account.rows[0]?.account_type !== expectedType) {
      throw new HttpError(403, `Only the ${expectedType === 'host' ? 'Host' : 'Renter'} can cancel this booking`);
    }
    if (!['pending', 'confirmed'].includes(b.status)) throw new HttpError(409, 'This booking can no longer be cancelled');
    if (b.owner_id === req.userId && b.status === 'pending') {
      throw new HttpError(400, 'Decline the request instead of cancelling it');
    }
    if (b.status === 'confirmed' && b.start_date <= today()) {
      throw new HttpError(409, 'This trip has already started');
    }

    await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [id]);
    if (b.payment_status === 'paid') {
      await client.query("UPDATE bookings SET payment_status = 'refunded' WHERE id = $1", [id]);
      await client.query("UPDATE payments SET status = 'refunded' WHERE booking_id = $1", [id]);
    }
  });
  res.json({ ok: true });
});

// Host marks a paid, started trip as completed (unlocks reviews).
router.post('/:id/complete', requireAccountType('host'), async (req, res) => {
  const id = idParam(req);
  const b = await loadBooking(id, req.userId);
  if (b.owner_id !== req.userId) throw new HttpError(403, 'Only the Host can complete a trip');
  if (b.status !== 'confirmed') throw new HttpError(409, 'Only confirmed trips can be completed');
  if (b.payment_status !== 'paid') throw new HttpError(409, 'The renter has not paid for this trip yet');
  if (b.start_date > today()) throw new HttpError(409, 'This trip has not started yet');

  await query("UPDATE bookings SET status = 'completed' WHERE id = $1", [id]);
  res.json({ ok: true });
});

export default router;
