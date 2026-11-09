// Sonde de test des API candidates (phase 2).
// Appelle chaque adresse une fois, avec un délai maximum de 8 secondes,
// et note : code HTTP, temps de réponse, en-têtes de limite, extrait de la réponse.
// Aucune clé privée ici : seulement des appels sans clé ou avec les clés « demo » publiques des fournisseurs.

const UA = 'radar-bourse-tests/0.1 (+https://github.com/Dom-Owen/mon-server)';

const TESTS = [
  // Tour 2 : Noozra (adresse d'appel trouvée dans sa page de documentation au tour 1)
  { id: 'nw-noozra-articles', need: 'actus', api: 'Noozra', url: 'https://noozra.com/api/articles?limit=3' },
  { id: 'nw-noozra-tech', need: 'actus', api: 'Noozra', url: 'https://noozra.com/api/articles?category=tech&limit=3' },
  { id: 'nw-noozra-docs-text', need: 'actus', api: 'Noozra', url: 'https://noozra.com/api', grep: /(categor|rate|limit|licen|terms|attribut|language|lang)/i },
];

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function trim(v, depth = 0) {
  if (v == null || typeof v === 'number' || typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  if (depth >= 3) return Array.isArray(v) ? `[tableau de ${v.length}]` : '{…}';
  if (Array.isArray(v)) return v.slice(0, 2).map((x) => trim(x, depth + 1)).concat(v.length > 2 ? [`… +${v.length - 2}`] : []);
  const keys = Object.keys(v);
  const out = {};
  for (const k of keys.slice(0, 15)) out[k] = trim(v[k], depth + 1);
  if (keys.length > 15) out['…'] = `+${keys.length - 15} clés`;
  return out;
}

async function run(t) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  const t0 = Date.now();
  const res = { id: t.id, need: t.need, api: t.api, url: t.url.replace(/(apikey|api_token|token)=[^&]+/gi, '$1=***') };
  try {
    const r = await fetch(t.url, { headers: { 'User-Agent': UA, Accept: 'application/json, text/html;q=0.8' }, signal: ctrl.signal });
    const body = await r.text();
    res.status = r.status;
    res.ms = Date.now() - t0;
    res.bytes = body.length;
    res.contentType = r.headers.get('content-type');
    const limits = {};
    for (const [k, v] of r.headers) if (/ratelimit|rate-limit|retry-after|x-api|quota|remaining|cache-control|age/i.test(k)) limits[k] = v;
    res.headers = limits;
    let json = null;
    try { json = JSON.parse(body); } catch { /* pas du JSON */ }
    if (json !== null) {
      if (t.pick) res.picked = Object.fromEntries(t.pick.map((p) => [p, p === 'items' ? (Array.isArray(json.feed) ? json.feed.length : json.items) : getPath(json, p)]));
      else res.sample = trim(json);
    } else {
      res.text = body.replace(/\s+/g, ' ').slice(0, 400);
      if (t.grep) {
        const plain = body.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
        res.grep = plain.split(/(?<=[.!?:])\s+/).filter((x) => t.grep.test(x)).slice(0, 40).map((x) => x.slice(0, 220));
      }
      if (t.links) res.links = [...new Set(body.match(/https?:\/\/[^"'<> ]*api[^"'<> ]*/gi) || [])].slice(0, 30);
    }
  } catch (e) {
    res.ms = Date.now() - t0;
    res.error = e.name === 'AbortError' ? 'délai de 8 s dépassé' : String(e.message || e);
  } finally {
    clearTimeout(timer);
  }
  return res;
}

const results = [];
for (const t of TESTS) {
  results.push(await run(t));
  await new Promise((r) => setTimeout(r, 1500)); // politesse : pas de rafale
}
console.log(JSON.stringify({ ranAt: new Date().toISOString(), runner: 'GitHub Actions', results }, null, 2));
