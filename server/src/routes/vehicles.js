import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { HttpError, idParam, parse, requireAccountType, requireAuth, today } from '../http.js';
import { SELECT_CARD, toVehicle } from '../vehicleQueries.js';

const router = Router();

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');

// Photos must be files uploaded through POST /api/uploads.
const photoPath = z.string().regex(/^\/uploads\/[0-9a-f-]{36}\.(jpg|png|webp)$/, 'Invalid photo');

const vehicleSchema = z.object({
  make: z.string().trim().min(1).max(40),
  model: z.string().trim().min(1).max(40),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  plate: z.string().trim().max(15).optional().or(z.literal('')),
  color: z.string().trim().max(30).optional().or(z.literal('')),
  transmission: z.enum(['automatic', 'manual']),
  fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric']),
  seats: z.coerce.number().int().min(1).max(15),
  rangeMiles: z.number().int().positive().max(2000).nullable().optional(),
  location: z.string().trim().min(2).max(100),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  pricePerDay: z.coerce.number().positive().max(100000),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
  photos: z.array(photoPath).max(8).default([]),
  availableWeekends: z.boolean().default(true),
  active: z.boolean().optional(),
});

const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  location: z.string().trim().max(100).optional(),
  start: dateStr.optional(),
  end: dateStr.optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric']).optional(),
  seats: z.coerce.number().int().min(1).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusMiles: z.coerce.number().positive().max(100).default(25),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating']).default('newest'),
}).refine((f) => (f.lat === undefined) === (f.lng === undefined), 'Provide both latitude and longitude')
  .refine((f) => Boolean(f.location) || f.lat !== undefined, 'Provide a location or your coordinates');

// A vehicle with pending or upcoming trips cannot be unlisted.
async function assertCanUnlist(id) {
  const open = await query(
    `SELECT 1 FROM bookings WHERE vehicle_id = $1 AND status IN ('pending', 'confirmed') AND end_date >= $2 LIMIT 1`,
    [id, today()],
  );
  if (open.rowCount) throw new HttpError(409, 'This vehicle has pending or upcoming bookings. Resolve them before unlisting');
}

// Public search. Only listed (active) vehicles; if dates are given, only vehicles free for them.
router.get('/', async (req, res) => {
  const f = parse(searchSchema, req.query);
  if ((f.start && !f.end) || (!f.start && f.end)) throw new HttpError(400, 'Provide both a start and an end date');
  if (f.start && f.end && f.end <= f.start) throw new HttpError(400, 'End date must be after the start date');

  const where = ['v.active = true'];
  const params = [];
  let distanceExpression = null;
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (f.q) {
    const p = add(`%${f.q}%`);
    where.push(`(v.make || ' ' || v.model || ' ' || v.year) ILIKE ${p}`);
  }
  if (f.location) where.push(`v.location ILIKE ${add(`%${f.location}%`)}`);
  if (f.lat !== undefined && f.lng !== undefined) {
    const lat = add(f.lat);
    const lng = add(f.lng);
    const radius = add(f.radiusMiles);
    distanceExpression = `3958.7613 * 2 * asin(sqrt(LEAST(1,
        power(sin(radians(v.lat - ${lat}) / 2), 2) +
        cos(radians(${lat})) * cos(radians(v.lat)) *
        power(sin(radians(v.lng - ${lng}) / 2), 2)
      )))`;
    where.push(`v.lat IS NOT NULL AND v.lng IS NOT NULL AND ${distanceExpression} <= ${radius}`);
  }
  if (f.minPrice !== undefined) where.push(`v.price_per_day >= ${add(f.minPrice)}`);
  if (f.maxPrice !== undefined) where.push(`v.price_per_day <= ${add(f.maxPrice)}`);
  if (f.transmission) where.push(`v.transmission = ${add(f.transmission)}`);
  if (f.fuel) where.push(`v.fuel = ${add(f.fuel)}`);
  if (f.seats) where.push(`v.seats >= ${add(f.seats)}`);
  if (f.start && f.end) {
    const s = add(f.start);
    const e = add(f.end);
    where.push(`NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.vehicle_id = v.id
        AND b.status IN ('pending', 'confirmed', 'completed')
        AND daterange(b.start_date, b.end_date, '[)') && daterange(${s}::date, ${e}::date, '[)'))`);
    // Cars that are not available on weekends are hidden when the trip touches a Saturday or Sunday.
    where.push(`(v.available_weekends OR NOT EXISTS (
      SELECT 1 FROM generate_series(${s}::date, ${e}::date, interval '1 day') g WHERE extract(isodow FROM g) IN (6, 7)))`);
  }

  const order = distanceExpression && f.sort === 'newest' ? `${distanceExpression} ASC` : {
    newest: 'v.created_at DESC',
    price_asc: 'v.price_per_day ASC',
    price_desc: 'v.price_per_day DESC',
    rating: 'rating DESC, review_count DESC',
  }[f.sort];

  const { rows } = await query(`${SELECT_CARD} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT 60`, params);
  res.json({ vehicles: rows.map((r) => toVehicle(r)) });
});

// Vehicles owned by the signed-in user (including unlisted ones). Includes the plate.
router.get('/mine', requireAuth, requireAccountType('host'), async (req, res) => {
  const { rows } = await query(`${SELECT_CARD} WHERE v.owner_id = $1 ORDER BY v.created_at DESC`, [req.userId]);
  res.json({ vehicles: rows.map((r) => toVehicle(r, { includePlate: true })) });
});

router.get('/:id', async (req, res) => {
  const id = idParam(req);
  const { rows } = await query(`${SELECT_CARD} WHERE v.id = $1`, [id]);
  const vehicle = rows[0];
  if (!vehicle) throw new HttpError(404, 'Vehicle not found');

  const [reviews, booked, owner] = await Promise.all([
    query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name AS reviewer_name
       FROM reviews r JOIN users u ON u.id = r.reviewer_id
       WHERE r.vehicle_id = $1 AND r.role = 'renter'
       ORDER BY r.created_at DESC LIMIT 20`,
      [id],
    ),
    query(
      `SELECT start_date, end_date FROM bookings
       WHERE vehicle_id = $1 AND status IN ('pending', 'confirmed', 'completed') AND end_date >= $2
       ORDER BY start_date`,
      [id, today()],
    ),
    query(
      `SELECT u.created_at,
              COALESCE((SELECT ROUND(AVG(rating), 1) FROM reviews WHERE reviewee_id = u.id AND role = 'renter'), 0) AS rating,
              (SELECT COUNT(*) FROM vehicles WHERE owner_id = u.id AND active) AS vehicle_count
       FROM users u WHERE u.id = $1`,
      [vehicle.owner_id],
    ),
  ]);

  res.json({
    vehicle: toVehicle(vehicle),
    owner: {
      id: vehicle.owner_id,
      name: vehicle.owner_name,
      memberSince: owner.rows[0].created_at,
      rating: owner.rows[0].rating,
      vehicleCount: owner.rows[0].vehicle_count,
    },
    reviews: reviews.rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      reviewerName: r.reviewer_name,
    })),
    unavailable: booked.rows.map((b) => ({ start: b.start_date, end: b.end_date })),
  });
});

const columns = (v) => [
  v.make, v.model, v.year, v.plate || null, v.color || null, v.transmission, v.fuel, v.seats,
  v.rangeMiles ?? null, v.location, v.lat ?? null, v.lng ?? null, v.pricePerDay, v.description || null,
  v.photos, v.photos[0] ?? null, v.availableWeekends,
];

router.post('/', requireAuth, requireAccountType('host'), async (req, res) => {
  const v = parse(vehicleSchema, req.body);
  const { rows } = await query(
    `INSERT INTO vehicles (owner_id, make, model, year, plate, color, transmission, fuel, seats, range_miles,
                           location, lat, lng, price_per_day, description, photos, image_url, available_weekends)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
    [req.userId, ...columns(v)],
  );
  res.status(201).json({ id: rows[0].id });
});

router.put('/:id', requireAuth, requireAccountType('host'), async (req, res) => {
  const id = idParam(req);
  const v = parse(vehicleSchema, req.body);
  if (v.active === false) {
    const owned = await query('SELECT active FROM vehicles WHERE id = $1 AND owner_id = $2', [id, req.userId]);
    if (owned.rows[0]?.active) await assertCanUnlist(id);
  }
  const { rowCount } = await query(
    `UPDATE vehicles SET make=$3, model=$4, year=$5, plate=$6, color=$7, transmission=$8, fuel=$9, seats=$10,
            range_miles=$11, location=$12, lat=$13, lng=$14, price_per_day=$15, description=$16,
            photos=$17, image_url=$18, available_weekends=$19, active=COALESCE($20, active)
     WHERE id = $1 AND owner_id = $2`,
    [id, req.userId, ...columns(v), v.active ?? null],
  );
  if (!rowCount) throw new HttpError(404, 'Vehicle not found');
  res.json({ ok: true });
});

// List / unlist toggle (used by the host dashboard).
router.patch('/:id/status', requireAuth, requireAccountType('host'), async (req, res) => {
  const id = idParam(req);
  const { active } = parse(z.object({ active: z.boolean() }), req.body);
  const owned = await query('SELECT 1 FROM vehicles WHERE id = $1 AND owner_id = $2', [id, req.userId]);
  if (!owned.rowCount) throw new HttpError(404, 'Vehicle not found');
  if (!active) await assertCanUnlist(id);
  await query('UPDATE vehicles SET active = $2 WHERE id = $1', [id, active]);
  res.json({ ok: true, active });
});

// "Delete" = unlist, so booking history and reviews are preserved.
router.delete('/:id', requireAuth, requireAccountType('host'), async (req, res) => {
  const id = idParam(req);
  const owned = await query('SELECT 1 FROM vehicles WHERE id = $1 AND owner_id = $2', [id, req.userId]);
  if (!owned.rowCount) throw new HttpError(404, 'Vehicle not found');
  await assertCanUnlist(id);
  await query('UPDATE vehicles SET active = false WHERE id = $1', [id]);
  res.json({ ok: true });
});

export default router;
