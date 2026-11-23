// api/archive.js — Vercel Serverless Function (Global Yayın & Okuma)
const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_HASH = '15aa02c137009395fd865dfbc5155ed38e82812c0bec5c86c66f28ebd7eeb685';
const ARCHIVE_KEY = 'akademikkapital:global:state';

async function redisCommand(command, ...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error('Veritabanı ortam değişkenleri tanımlı değil.');
  }
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([command, ...args])
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error || 'Redis hatası');
  }
  return data.result;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    try {
      const raw = await redisCommand('GET', ARCHIVE_KEY);
      const parsed = raw ? JSON.parse(raw) : { items: [], social: null, logo: null };
      return res.status(200).json({ ok: true, data: parsed });
    } catch (err) {
      return res.status(200).json({ ok: false, data: null, message: err.message });
    }
  }

  if (req.method === 'POST') {
    const authHeader = req.headers['x-editor-hash'] || '';
    if (authHeader !== ADMIN_HASH) {
      return res.status(401).json({ ok: false, message: 'Yetkisiz işlem.' });
    }

    try {
      const { action, payload } = req.body || {};
      const raw = await redisCommand('GET', ARCHIVE_KEY);
      const current = raw ? JSON.parse(raw) : { items: [], social: null, logo: null };
      current.items = Array.isArray(current.items) ? current.items : [];

      if (action === 'upsert_item' && payload && payload.id) {
        const idx = current.items.findIndex(x => x.id === payload.id);
        if (idx >= 0) current.items[idx] = payload;
        else current.items.unshift(payload);
      } else if (action === 'delete_item' && payload && payload.id) {
        current.items = current.items.filter(x => x.id !== payload.id);
      } else if (action === 'social_update' && payload) {
        current.social = payload;
      } else if (action === 'logo_update' && payload) {
        current.logo = payload.logo || null;
      } else if (action === 'logo_reset') {
        current.logo = null;
      }

      current.updatedAt = new Date().toISOString();
      await redisCommand('SET', ARCHIVE_KEY, JSON.stringify(current));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ ok: false, message: err.message });
    }
  }

  return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
}
