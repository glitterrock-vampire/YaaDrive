import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pathToFileURL } from 'node:url';
import { errorHandler } from './http.js';
import { migrate } from './migrate.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';
import dashboardRoutes from './routes/dashboard.js';
import favoriteRoutes from './routes/favorites.js';
import reviewRoutes from './routes/reviews.js';
import uploadRoutes from './routes/uploads.js';
import vehicleRoutes from './routes/vehicles.js';

export const app = express();

app.disable('x-powered-by');
// Uploaded images are loaded by the Angular app on a different origin.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = new Set([
  ...(process.env.CLIENT_ORIGIN || 'http://localhost:4200').split(',').map((origin) => origin.trim()).filter(Boolean),
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
]);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));
app.use(express.json({ limit: '100kb' }));

app.use('/uploads', uploadRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Slow down password guessing and account spam.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/uploads', uploadRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

// Start listening unless imported by tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3000;
  migrate()
    .then(() => app.listen(port, () => console.log(`YaadDrive API listening on http://localhost:${port}`)))
    .catch((err) => {
      console.error('Failed to start:', err);
      process.exit(1);
    });
}
