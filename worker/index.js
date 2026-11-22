// Somnia Magna Worker: serves the static site, a public read-only posts API, and an owner-only admin API.
// Owner-only = behind Cloudflare Access (emailed one-time code) AND the Access token is verified here again.
import { verifyAccessJwt } from './access.js';

const MAX_TITLE = 28;
const MAX_PHOTOS = 12;
const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, place TEXT NOT NULL, lon REAL NOT NULL, lat REAL NOT NULL, event_date TEXT, body TEXT, status TEXT NOT NULL DEFAULT \'published\', author TEXT NOT NULL, created_at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS photos (id TEXT PRIMARY KEY, post_id TEXT NOT NULL, r2_key TEXT NOT NULL, caption TEXT, sort INTEGER NOT NULL DEFAULT 0)',
  'CREATE INDEX IF NOT EXISTS photos_post ON photos(post_id)',
];
let schemaReady = false;

const send = (data, status = 200, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra } });
const clip = (s, n) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ').slice(0, n);

async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch(SCHEMA.map((q) => env.DB.prepare(q)));
  schemaReady = true;
}

async function owner(req, env) {
  // Local testing only: wrangler dev with DEV_EMAIL in .dev.vars. Never set in production.
  if (env.DEV_EMAIL && req.headers.get('x-dev-email') === env.DEV_EMAIL) return { email: env.DEV_EMAIL.toLowerCase() };
  const emails = String(env.OWNER_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  return verifyAccessJwt(req.headers.get('cf-access-jwt-assertion'), { teamDomain: env.TEAM_DOMAIN, aud: env.POLICY_AUD, emails });
}

function sniff(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return ['image/jpeg', 'jpg'];
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return ['image/png', 'png'];
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return ['image/webp', 'webp'];
  return null;
}

async function listPosts(env) {
  await ensureSchema(env);
  const posts = (await env.DB.prepare("SELECT id, title, place, lon, lat, event_date, body, created_at FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 200").all()).results;
  const photos = (await env.DB.prepare('SELECT id, post_id, r2_key, caption FROM photos ORDER BY sort, rowid').all()).results;
  const by = {};
  photos.forEach((p) => { (by[p.post_id] = by[p.post_id] || []).push({ id: p.id, url: '/media/' + p.r2_key, caption: p.caption || '' }); });
  return send({ posts: posts.map((p) => ({ ...p, photos: by[p.id] || [] })) });
}

async function media(env, path) {
  const key = decodeURIComponent(path.slice('/media/'.length));
  if (!/^p\/[\w-]+\/[\w-]+\.(jpg|png|webp)$/.test(key)) return new Response('Not found', { status: 404 });
  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
}

function readFields(form) {
  const title = clip(form.get('title'), MAX_TITLE), place = clip(form.get('place'), 60);
  const lon = parseFloat(form.get('lon')), lat = parseFloat(form.get('lat'));
  if (!title) return { error: 'Add a title.' };
  if (!place) return { error: 'Add a place.' };
  if (!(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90)) return { error: 'Pick a listed city or enter longitude and latitude.' };
  return { title, place, lon, lat, date: clip(form.get('date'), 32), body: String(form.get('body') || '').trim().slice(0, 4000) };
}

// Validates and stores the new photo files in R2. Returns { saved } or { error } (and cleans up after itself on error).
async function storePhotos(env, form, postId, startSort) {
  const files = form.getAll('photos').filter((f) => f && typeof f === 'object' && f.size > 0), saved = [];
  try {
    let n = 0;
    for (const f of files) {
      if (f.size > MAX_PHOTO_BYTES) throw new Error('A photo is over 6 MB.');
      const buf = await f.arrayBuffer(), t = sniff(buf);
      if (!t) throw new Error('Only JPEG, PNG or WebP photos.');
      const key = `p/${postId}/${crypto.randomUUID()}.${t[1]}`;
      await env.PHOTOS.put(key, buf, { httpMetadata: { contentType: t[0] } });
      saved.push({ key, caption: clip(form.get('caption_' + n), 120), sort: startSort + n });
      n++;
    }
  } catch (e) {
    await Promise.all(saved.map((s) => env.PHOTOS.delete(s.key)));
    return { error: e.message || 'Upload failed.' };
  }
  return { saved };
}

async function readForm(req) {
  try { return await req.formData(); } catch (e) { return null; }
}

async function createPost(req, env, user) {
  await ensureSchema(env);
  const form = await readForm(req);
  if (!form) return send({ error: 'Could not read the form.' }, 400);
  const f = readFields(form);
  if (f.error) return send({ error: f.error }, 400);
  if (form.getAll('photos').filter((x) => x && typeof x === 'object' && x.size > 0).length > MAX_PHOTOS) return send({ error: `Up to ${MAX_PHOTOS} photos per post.` }, 400);
  const id = crypto.randomUUID();
  const up = await storePhotos(env, form, id, 0);
  if (up.error) return send({ error: up.error }, 400);
  const stmts = [env.DB.prepare('INSERT INTO posts (id, title, place, lon, lat, event_date, body, status, author, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id, f.title, f.place, f.lon, f.lat, f.date, f.body, 'published', user.email, Date.now())];
  up.saved.forEach((s) => stmts.push(env.DB.prepare('INSERT INTO photos (id, post_id, r2_key, caption, sort) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), id, s.key, s.caption, s.sort)));
  try { await env.DB.batch(stmts); } catch (e) { await Promise.all(up.saved.map((s) => env.PHOTOS.delete(s.key))); throw e; }
  return send({ id }, 201);
}

// Edit: text fields, captions on kept photos, photos to remove (JSON array of ids in "remove"), and new photos to add.
async function updatePost(req, env, id) {
  await ensureSchema(env);
  const post = await env.DB.prepare('SELECT id FROM posts WHERE id = ?').bind(id).first();
  if (!post) return send({ error: 'That post no longer exists.' }, 404);
  const form = await readForm(req);
  if (!form) return send({ error: 'Could not read the form.' }, 400);
  const f = readFields(form);
  if (f.error) return send({ error: f.error }, 400);
  const existing = (await env.DB.prepare('SELECT id, r2_key, sort FROM photos WHERE post_id = ? ORDER BY sort, rowid').bind(id).all()).results;
  let removeIds = [];
  try { removeIds = JSON.parse(String(form.get('remove') || '[]')); } catch (e) { return send({ error: 'Bad request.' }, 400); }
  if (!Array.isArray(removeIds)) return send({ error: 'Bad request.' }, 400);
  const drop = existing.filter((p) => removeIds.includes(p.id)), keep = existing.filter((p) => !removeIds.includes(p.id));
  const incoming = form.getAll('photos').filter((x) => x && typeof x === 'object' && x.size > 0).length;
  if (keep.length + incoming > MAX_PHOTOS) return send({ error: `Up to ${MAX_PHOTOS} photos per post.` }, 400);
  const up = await storePhotos(env, form, id, existing.reduce((m, p) => Math.max(m, p.sort + 1), 0));
  if (up.error) return send({ error: up.error }, 400);
  const stmts = [env.DB.prepare('UPDATE posts SET title = ?, place = ?, lon = ?, lat = ?, event_date = ?, body = ? WHERE id = ?').bind(f.title, f.place, f.lon, f.lat, f.date, f.body, id)];
  keep.forEach((p) => { if (form.has('caption_' + p.id)) stmts.push(env.DB.prepare('UPDATE photos SET caption = ? WHERE id = ?').bind(clip(form.get('caption_' + p.id), 120), p.id)); });
  drop.forEach((p) => stmts.push(env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(p.id)));
  up.saved.forEach((s) => stmts.push(env.DB.prepare('INSERT INTO photos (id, post_id, r2_key, caption, sort) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), id, s.key, s.caption, s.sort)));
  try { await env.DB.batch(stmts); } catch (e) { await Promise.all(up.saved.map((s) => env.PHOTOS.delete(s.key))); throw e; }
  await Promise.all(drop.map((p) => env.PHOTOS.delete(p.r2_key)));
  return send({ id });
}

async function deletePost(env, id) {
  await ensureSchema(env);
  const photos = (await env.DB.prepare('SELECT r2_key FROM photos WHERE post_id = ?').bind(id).all()).results;
  await Promise.all(photos.map((p) => env.PHOTOS.delete(p.r2_key)));
  await env.DB.batch([env.DB.prepare('DELETE FROM photos WHERE post_id = ?').bind(id), env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id)]);
  return new Response(null, { status: 204 });
}

// The admin view is the normal site plus the owner-only script. Visitors never receive that script.
async function adminPage(req, env) {
  const res = await env.ASSETS.fetch(new Request(new URL('/', req.url)));
  let html = await res.text();
  html = html.replace('</head>', '<script>window.SM_ADMIN=true</script></head>');
  const j = html.lastIndexOf('</body>');
  html = html.slice(0, j) + '<script src="/admin/cities-all.js"></script><script src="/admin/admin.js"></script>' + html.slice(j);
  return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname, m = req.method;
    try {
      if (path === '/api/posts' && m === 'GET') return await listPosts(env);
      if (path.startsWith('/media/') && m === 'GET') return await media(env, path);

      if (path === '/admin' || path.startsWith('/admin/')) {
        if (!(await owner(req, env))) return new Response('Forbidden', { status: 403 });
        if (path === '/admin') return await adminPage(req, env);
        if (path === '/admin/' || path === '/admin/index.html') return Response.redirect(new URL('/admin', req.url).href, 302);
        return env.ASSETS.fetch(req);
      }
      if (path.startsWith('/api/admin/')) {
        const user = await owner(req, env);
        if (!user) return send({ error: 'Forbidden' }, 403);
        if (m !== 'GET' && req.headers.get('x-requested-with') !== 'sm') return send({ error: 'Bad request' }, 400);
        if (path === '/api/admin/me' && m === 'GET') return send({ email: user.email });
        if (path === '/api/admin/posts' && m === 'POST') return await createPost(req, env, user);
        const d = /^\/api\/admin\/posts\/([\w-]+)$/.exec(path);
        if (d && m === 'PUT') return await updatePost(req, env, d[1]);
        if (d && m === 'DELETE') return await deletePost(env, d[1]);
        return send({ error: 'Not found' }, 404);
      }
      if (path.startsWith('/api/')) return send({ error: 'Not found' }, 404);
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e);
      return send({ error: 'Something went wrong.' }, 500);
    }
  },
};
