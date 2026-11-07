import { Router } from 'express';
import { query } from '../db.js';
import { HttpError, idParam, requireAuth } from '../http.js';
import { SELECT_CARD, toVehicle } from '../vehicleQueries.js';

const router = Router();
router.use(requireAuth);

// Ids only: used to fill in the hearts on search results.
router.get('/ids', async (req, res) => {
  const { rows } = await query('SELECT vehicle_id FROM favorites WHERE user_id = $1', [req.userId]);
  res.json({ ids: rows.map((r) => r.vehicle_id) });
});

// Full cards for the profile page (listed vehicles only).
router.get('/', async (req, res) => {
  const { rows } = await query(
    `${SELECT_CARD} JOIN favorites f ON f.vehicle_id = v.id
     WHERE f.user_id = $1 AND v.active = true ORDER BY f.created_at DESC`,
    [req.userId],
  );
  res.json({ vehicles: rows.map((r) => toVehicle(r)) });
});

router.put('/:vehicleId', async (req, res) => {
  const vehicleId = idParam(req, 'vehicleId');
  const exists = await query('SELECT 1 FROM vehicles WHERE id = $1 AND active = true', [vehicleId]);
  if (!exists.rowCount) throw new HttpError(404, 'Vehicle not found');
  await query('INSERT INTO favorites (user_id, vehicle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.userId, vehicleId]);
  res.json({ ok: true });
});

router.delete('/:vehicleId', async (req, res) => {
  const vehicleId = idParam(req, 'vehicleId');
  await query('DELETE FROM favorites WHERE user_id = $1 AND vehicle_id = $2', [req.userId, vehicleId]);
  res.json({ ok: true });
});

export default router;
