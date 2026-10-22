/* Constellation — where the back end keeps what people change.

   Two kinds of record:
     ledger          shared: which stories a coach has read against their source, by whom, when
     user:<ns>       one browser's own saves, trails and notes (ns is a random id the browser makes)

   With a Redis store connected (Vercel's Upstash integration sets KV_REST_API_URL and
   KV_REST_API_TOKEN; a plain Upstash database sets UPSTASH_REDIS_REST_URL and
   UPSTASH_REDIS_REST_TOKEN) records persist. Without one they live in this function instance's
   memory, which Vercel recycles, and the API says so (`store: "memory"`), so the browser keeps
   its own copy as the record of truth. The leading underscore keeps Vercel from serving this
   file as a function. */

const PREFIX = 'constellation:';

function config() {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

const memory = new Map();

async function command(args) {
  const c = config();
  const r = await fetch(c.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`store: ${j.error || r.status}`);
  return j.result;
}

module.exports = {
  kind() { return config() ? 'kv' : 'memory'; },
  async get(key) {
    if (!config()) return memory.has(PREFIX + key) ? JSON.parse(memory.get(PREFIX + key)) : null;
    const v = await command(['GET', PREFIX + key]);
    return v == null ? null : JSON.parse(v);
  },
  async set(key, value) {
    const s = JSON.stringify(value);
    if (!config()) { memory.set(PREFIX + key, s); return; }
    await command(['SET', PREFIX + key, s]);
  },
  _reset() { memory.clear(); },
};
