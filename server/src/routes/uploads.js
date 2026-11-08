import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { objectStorage } from '../storage.js';
import { HttpError, requireAccountType, requireAuth } from '../http.js';

export const UPLOAD_DIR = fileURLToPath(new URL('../../uploads', import.meta.url));
mkdirSync(UPLOAD_DIR, { recursive: true });

// The file extension is derived from the verified MIME type, never from the client's file name.
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const CONTENT_TYPE = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const FILENAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, 'Upload a JPEG, PNG or WebP image')),
});

const router = Router();

router.get('/:filename', async (req, res) => {
  const { filename } = req.params;
  if (!FILENAME.test(filename)) throw new HttpError(404, 'Image not found');
  const extension = path.extname(filename);
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.type(CONTENT_TYPE[extension]);

  if (objectStorage) {
    try {
      const { Body } = await objectStorage.client.send(new GetObjectCommand({
        Bucket: objectStorage.bucket,
        Key: `uploads/${filename}`,
      }));
      if (!Body) throw new HttpError(404, 'Image not found');
      res.send(Buffer.from(await Body.transformToByteArray()));
    } catch (error) {
      if (error instanceof HttpError) throw error;
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        throw new HttpError(404, 'Image not found');
      }
      throw error;
    }
    return;
  }

  res.sendFile(path.join(UPLOAD_DIR, filename), (error) => {
    if (error && !res.headersSent) res.status(error.statusCode === 404 ? 404 : 500).json({ error: error.statusCode === 404 ? 'Image not found' : 'Could not load image' });
  });
});

router.post('/', requireAuth, requireAccountType('host'), upload.single('image'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No image received');
  const filename = `${randomUUID()}${EXT[req.file.mimetype]}`;
  if (objectStorage) {
    await objectStorage.client.send(new PutObjectCommand({
      Bucket: objectStorage.bucket,
      Key: `uploads/${filename}`,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      CacheControl: 'public, max-age=604800, immutable',
    }));
  } else {
    await writeFile(path.join(UPLOAD_DIR, filename), req.file.buffer, { flag: 'wx' });
  }
  res.status(201).json({ url: `/uploads/${path.basename(filename)}` });
});

export default router;
