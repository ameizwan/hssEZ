// Cloudflare Pages Function — /api/permits
// Backed by D1 (SQLite). Binding name "DB" must match wrangler.toml.
//
// GET  /api/permits  -> [] of full permit objects (D1 is the source of truth)
// POST /api/permits  -> body { permits: [...] } upserts each permit;
//                       an incoming permit only overwrites a stored one if
//                       its updatedAt is newer (last-write-wins, server-checked).

export async function onRequestGet(context) {
  const { env } = context;
  const { results } = await env.DB.prepare(
    'SELECT data FROM permits ORDER BY created_at ASC'
  ).all();
  const permits = results.map(r => JSON.parse(r.data));
  return Response.json(permits);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response('Invalid JSON', { status: 400 });
  }
  const incoming = Array.isArray(body?.permits) ? body.permits : [];

  const stmt = env.DB.prepare(`
    INSERT INTO permits (id, no, type, status, data, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT(id) DO UPDATE SET
      no=excluded.no, type=excluded.type, status=excluded.status,
      data=excluded.data, updated_at=excluded.updated_at
    WHERE excluded.updated_at > permits.updated_at
  `);

  const batch = [];
  for (const p of incoming) {
    if (!p || typeof p.id !== 'string') continue;
    batch.push(stmt.bind(
      p.id,
      p.no || '',
      p.type || '',
      p.status || '',
      JSON.stringify(p),
      Number(p.createdAt) || Date.now(),
      Number(p.updatedAt) || Date.now()
    ));
  }
  if (batch.length) await env.DB.batch(batch);

  const { results } = await env.DB.prepare(
    'SELECT data FROM permits ORDER BY created_at ASC'
  ).all();
  return Response.json({ ok: true, permits: results.map(r => JSON.parse(r.data)) });
}
