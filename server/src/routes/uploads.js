import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError, requireAccountType, requireAuth } from '../http.js';

export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));
mkdirSync(UPLOAD_DIR, { recursive: true });

// The file extension is derived from the verified MIME type, never from the client's file name.
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Upload a JPEG, PNG or WebP image')),
});

const router = Router();

router.post('/', requireAuth, requireAccountType('host'), upload.single('image'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'No image received');
  res.status(201).json({ url: `/uploads/${path.basename(req.file.filename)}` });
});

export default router;
