import { Router } from 'express';
import { query } from '../db.js';
import { requireAccountType, requireAuth, today } from '../http.js';

const router = Router();

// Owner dashboard: headline numbers, 6-month earnings (with change vs last month) and per-vehicle status.
router.get('/owner', requireAuth, requireAccountType('host'), async (req, res) => {
  const me = req.userId;
  const t = today();

  const [totals, monthly, perVehicle, rating] = await Promise.all([
    query(
      `SELECT
         COUNT(DISTINCT v.id) FILTER (WHERE v.active)                                           AS listed_vehicles,
         COUNT(b.id) FILTER (WHERE b.status = 'pending')                                        AS pending_requests,
         COUNT(b.id) FILTER (WHERE b.status = 'confirmed' AND b.end_date >= $2)                 AS upcoming_trips,
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'completed' AND b.payment_status = 'paid'), 0) AS earned,
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'confirmed' AND b.payment_status = 'paid'), 0)  AS upcoming_earnings
       FROM vehicles v LEFT JOIN bookings b ON b.vehicle_id = v.id
       WHERE v.owner_id = $1`,
      [me, t],
    ),
    query(
      `SELECT to_char(m, 'YYYY-MM') AS month,
              COALESCE((SELECT SUM(b.total_price) FROM bookings b JOIN vehicles v ON v.id = b.vehicle_id
                        WHERE v.owner_id = $1 AND b.payment_status = 'paid' AND b.status IN ('confirmed', 'completed')
                          AND date_trunc('month', b.start_date) = m), 0) AS amount
       FROM generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') AS m
       ORDER BY m`,
      [me],
    ),
    query(
      `SELECT v.id, v.make, v.model, v.year, v.active, v.price_per_day, v.image_url, v.photos,
              COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))                              AS trips,
              COALESCE(SUM(b.total_price) FILTER (WHERE b.payment_status = 'paid' AND b.status IN ('confirmed', 'completed')), 0) AS earnings,
              COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.vehicle_id = v.id AND r.role = 'renter'), 0) AS rating,
              EXISTS (SELECT 1 FROM bookings b2 WHERE b2.vehicle_id = v.id AND b2.status = 'confirmed'
                      AND b2.start_date <= $2 AND b2.end_date >= $2) AS booked_now
       FROM vehicles v LEFT JOIN bookings b ON b.vehicle_id = v.id
       WHERE v.owner_id = $1
       GROUP BY v.id ORDER BY v.created_at DESC, v.id`,
      [me, t],
    ),
    query(`SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS rating, COUNT(*) AS count FROM reviews WHERE reviewee_id = $1 AND role = 'renter'`, [me]),
  ]);

  const t0 = totals.rows[0];
  const months = monthly.rows.map((r) => ({ month: r.month, amount: r.amount }));
  const thisMonth = months.at(-1)?.amount ?? 0;
  const lastMonth = months.at(-2)?.amount ?? 0;

  res.json({
    listedVehicles: t0.listed_vehicles,
    pendingRequests: t0.pending_requests,
    upcomingTrips: t0.upcoming_trips,
    earned: t0.earned,
    upcomingEarnings: t0.upcoming_earnings,
    rating: rating.rows[0].rating,
    reviewCount: rating.rows[0].count,
    monthly: months,
    thisMonth,
    lastMonth,
    // null when there is nothing to compare against
    changePct: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null,
    vehicles: perVehicle.rows.map((r) => ({
      id: r.id,
      make: r.make,
      model: r.model,
      year: r.year,
      active: r.active,
      // listed = visible to renters, booked = a confirmed trip is under way today, unlisted = hidden
      status: !r.active ? 'unlisted' : r.booked_now ? 'booked' : 'listed',
      pricePerDay: r.price_per_day,
      imageUrl: r.photos?.[0] ?? r.image_url ?? null,
      trips: r.trips,
      earnings: r.earnings,
      rating: r.rating,
    })),
  });
});

export default router;
