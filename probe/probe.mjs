// Sonde de test des API candidates (phase 2).
// Appelle chaque adresse une fois, avec un délai maximum de 8 secondes,
// et note : code HTTP, temps de réponse, en-têtes de limite, extrait de la réponse.
// Aucune clé privée ici : seulement des appels sans clé ou avec les clés « demo » publiques des fournisseurs.

const UA = 'radar-bourse-tests/0.1 (+https://github.com/Dom-Owen/mon-server)';

const TESTS = [
  // Taux de change
  { id: 'fx-frankfurter-v1', need: 'change', api: 'Frankfurter', url: 'https://api.frankfurter.dev/v1/latest?symbols=USD,GBP,JPY,CHF' },
  { id: 'fx-frankfurter-v2', need: 'change', api: 'Frankfurter', url: 'https://api.frankfurter.dev/v2/rate/eur/usd' },
  { id: 'fx-currencyapi-jsdelivr', need: 'change', api: 'Currency-api', url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.min.json', pick: ['date', 'eur.usd', 'eur.gbp', 'eur.jpy', 'eur.chf', 'eur.xaf'] },
  { id: 'fx-currencyapi-pages', need: 'change', api: 'Currency-api', url: 'https://latest.currency-api.pages.dev/v1/currencies/eur.min.json', pick: ['date', 'eur.usd', 'eur.gbp'] },
  { id: 'fx-vatcomply', need: 'change', api: 'VATComply', url: 'https://api.vatcomply.com/rates?base=EUR', pick: ['date', 'base', 'rates.USD', 'rates.GBP', 'rates.JPY', 'rates.CHF'] },

  // Cours actions et ETF
  { id: 'px-twelvedata-us-demo', need: 'cours', api: 'Twelve Data', url: 'https://api.twelvedata.com/quote?symbol=AAPL&apikey=demo' },
  { id: 'px-twelvedata-paris-demo', need: 'cours', api: 'Twelve Data', url: 'https://api.twelvedata.com/quote?symbol=MC&exchange=Euronext&apikey=demo' },
  { id: 'px-eodhd-us-demo', need: 'cours', api: 'EODHD', url: 'https://eodhd.com/api/eod/AAPL.US?api_token=demo&fmt=json&from=2026-11-01' },
  { id: 'px-eodhd-paris-demo', need: 'cours', api: 'EODHD', url: 'https://eodhd.com/api/eod/MC.PA?api_token=demo&fmt=json&from=2026-11-01' },
  { id: 'px-fmp-nokey', need: 'cours', api: 'Financial Modeling Prep', url: 'https://financialmodelingprep.com/stable/quote?symbol=AAPL' },
  { id: 'px-fmp-demo', need: 'cours', api: 'Financial Modeling Prep', url: 'https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=demo' },
  { id: 'px-finnhub-nokey', need: 'cours', api: 'Finnhub', url: 'https://finnhub.io/api/v1/quote?symbol=AAPL' },
  { id: 'px-alphavantage-demo', need: 'cours', api: 'Alpha Vantage', url: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=demo' },

  // Fondamentaux
  { id: 'fd-sec-companyfacts', need: 'fondamentaux', api: 'SEC EDGAR', url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json', pick: ['entityName', 'cik'] },
  { id: 'fd-sec-tickers', need: 'fondamentaux', api: 'SEC EDGAR', url: 'https://www.sec.gov/files/company_tickers.json', pick: ['0', '1'] },
  { id: 'fd-eodhd-demo', need: 'fondamentaux', api: 'EODHD', url: 'https://eodhd.com/api/fundamentals/AAPL.US?api_token=demo&fmt=json', pick: ['General.Name', 'General.Exchange', 'Highlights.PERatio', 'Highlights.ProfitMargin'] },
  { id: 'fd-alphavantage-overview-demo', need: 'fondamentaux', api: 'Alpha Vantage', url: 'https://www.alphavantage.co/query?function=OVERVIEW&symbol=IBM&apikey=demo', pick: ['Name', 'PERatio', 'ProfitMargin', 'Information', 'Note'] },
  { id: 'fd-finnhub-nokey', need: 'fondamentaux', api: 'Finnhub', url: 'https://finnhub.io/api/v1/stock/metric?symbol=AAPL&metric=all' },

  // Actualités
  { id: 'nw-marketaux-nokey', need: 'actus', api: 'MarketAux', url: 'https://api.marketaux.com/v1/news/all?symbols=AAPL&language=en' },
  { id: 'nw-gnews-nokey', need: 'actus', api: 'GNews', url: 'https://gnews.io/api/v4/search?q=LVMH&lang=fr' },
  { id: 'nw-newsdata-nokey', need: 'actus', api: 'NewsData', url: 'https://newsdata.io/api/1/latest?q=LVMH&language=fr' },
  { id: 'nw-finnhub-nokey', need: 'actus', api: 'Finnhub', url: 'https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2026-11-01&to=2026-11-08' },
  { id: 'nw-alphavantage-demo', need: 'actus', api: 'Alpha Vantage', url: 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=AAPL&apikey=demo', pick: ['items', 'feed.0.title', 'feed.0.time_published', 'feed.0.source', 'Information'] },
  { id: 'nw-noozra-docs', need: 'actus', api: 'Noozra', url: 'https://noozra.com/api', links: true },
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
