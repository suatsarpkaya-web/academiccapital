export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(503).json({ error: 'Supabase is not configured.' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    url,
    key,
    redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || null
  });
}
