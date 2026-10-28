/**
 * Cron-secret guard. FAILS CLOSED: if CRON_SECRET is not configured, every request is rejected.
 */
export function isAuthorizedCron(req: Request): boolean {
  const expected = Deno.env.get('CRON_SECRET') ?? ''
  const provided = req.headers.get('x-cron-secret') ?? ''
  if (expected.length < 16) return false // refuse to run with a missing/weak secret
  if (expected.length !== provided.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i)
  return diff === 0
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}
