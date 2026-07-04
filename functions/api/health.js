// GET /api/health — quick check that the D1 binding is wired up correctly.
export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM permits'
    ).all();
    return Response.json({ ok: true, db: 'connected', permits: results[0]?.n ?? 0 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
