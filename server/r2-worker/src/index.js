const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE = 5 * 1024 * 1024;
const CACHE_CONTROL = 'public, max-age=604800, immutable';

function isAuthorized(request, token) {
  const supplied = new TextEncoder().encode(request.headers.get('Authorization') ?? '');
  const expected = new TextEncoder().encode(`Bearer ${token}`);
  let mismatch = supplied.length ^ expected.length;
  for (let i = 0; i < Math.max(supplied.length, expected.length); i++) {
    mismatch |= (supplied[i] ?? 0) ^ (expected[i] ?? 0);
  }
  return mismatch === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/uploads\/([^/]+)$/);
    if (!match || !FILE_NAME.test(match[1])) return new Response('Not found', { status: 404 });

    const key = `uploads/${match[1]}`;
    if (request.method === 'GET') {
      const object = await env.PHOTOS.get(key);
      if (!object) return new Response('Not found', { status: 404 });
      const headers = new Headers({
        'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
        'Cache-Control': CACHE_CONTROL,
        'X-Content-Type-Options': 'nosniff',
      });
      if (object.httpEtag) headers.set('ETag', object.httpEtag);
      return new Response(object.body, { headers });
    }

    if (request.method !== 'PUT') return new Response('Method not allowed', { status: 405 });
    if (!env.UPLOAD_SECRET) return new Response('Storage is not configured', { status: 503 });
    if (!isAuthorized(request, env.UPLOAD_SECRET)) return new Response('Unauthorized', { status: 401 });

    const contentType = request.headers.get('Content-Type') ?? '';
    const declaredLength = Number(request.headers.get('Content-Length') ?? 0);
    if (!CONTENT_TYPES.has(contentType)) return new Response('Unsupported image type', { status: 415 });
    if (declaredLength > MAX_SIZE) return new Response('Image too large', { status: 413 });

    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_SIZE) return new Response('Image too large', { status: 413 });
    await env.PHOTOS.put(key, body, {
      httpMetadata: { contentType, cacheControl: CACHE_CONTROL },
    });
    return new Response(null, { status: 201 });
  },
};
