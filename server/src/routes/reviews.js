import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError, parse, requireAuth } from '../http.js';

const router = Router();

const reviewSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
});

// Renters review the vehicle/Host; Hosts review the Renter. One review each per completed trip.
router.post('/', requireAuth, async (req, res) => {
  const { bookingId, rating, comment } = parse(reviewSchema, req.body);

  const { rows } = await query(
    `SELECT b.id, b.status, b.vehicle_id, b.renter_id, v.owner_id
     FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id WHERE b.id = $1`,
    [bookingId],
  );
  const b = rows[0];
  if (!b || (b.renter_id !== req.userId && b.owner_id !== req.userId)) throw new HttpError(404, 'Booking not found');
  if (b.status !== 'completed') throw new HttpError(409, 'You can leave a review once the trip is completed');

  const role = b.renter_id === req.userId ? 'renter' : 'owner';
  const { rows: accountRows } = await query('SELECT account_type FROM users WHERE id = $1', [req.userId]);
  const accountType = role === 'renter' ? 'renter' : 'host';
  if (accountRows[0]?.account_type !== accountType) {
    throw new HttpError(403, `Only the ${accountType === 'host' ? 'Host' : 'Renter'} can leave this review`);
  }
  const revieweeId = role === 'renter' ? b.owner_id : b.renter_id;

  try {
    await query(
      `INSERT INTO reviews (booking_id, vehicle_id, reviewer_id, reviewee_id, role, rating, comment)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [bookingId, b.vehicle_id, req.userId, revieweeId, role, rating, comment || null],
    );
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, 'You have already reviewed this trip');
    throw err;
  }
  res.status(201).json({ ok: true });
});

export default router;
