/* HSSE e-PTW sync API — backs the PWA's permits/observations with D1
   so records are shared across devices instead of living only in
   one phone's localStorage. Records are stored as JSON documents
   keyed by the app's own id; the client remains the source of truth
   for shape/validation, this just persists and redistributes it. */

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function listRows(db, table) {
  const { results } = await db.prepare(`SELECT data FROM ${table} ORDER BY updated_at ASC`).all();
  return results.map(r => JSON.parse(r.data));
}

async function bulkUpsert(db, table, items) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const now = Date.now();
  const stmt = db.prepare(
    `INSERT INTO ${table} (id, data, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(id) DO UPDATE SET data = ?2, updated_at = ?3`
  );
  const batch = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string' || !item.id) continue;
    batch.push(stmt.bind(item.id, JSON.stringify(item), now));
  }
  if (batch.length) await db.batch(batch);
  return batch.length;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (!pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }

    try {
      if (pathname === '/api/permits' && request.method === 'GET') {
        return json(await listRows(env.DB, 'permits'));
      }
      if (pathname === '/api/permits/bulk' && request.method === 'POST') {
        const { items } = await request.json();
        const count = await bulkUpsert(env.DB, 'permits', items);
        return json({ synced: count });
      }
      if (pathname === '/api/observations' && request.method === 'GET') {
        return json(await listRows(env.DB, 'observations'));
      }
      if (pathname === '/api/observations/bulk' && request.method === 'POST') {
        const { items } = await request.json();
        const count = await bulkUpsert(env.DB, 'observations', items);
        return json({ synced: count });
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
