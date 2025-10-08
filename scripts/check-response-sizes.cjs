/*
  CI script: Fetch key endpoints and assert response payload size budgets using X-Response-Bytes or Content-Length.
  Usage: node scripts/check-response-sizes.cjs
*/
const http = require('http');
const https = require('https');

const BASE = 'http://localhost:3000';

function fetchJSON(urlStr) {
  return new Promise((resolve, reject) => {
    const lib = urlStr.startsWith('https') ? https : http;
    const req = lib.request(urlStr, { method: 'GET', timeout: 5000, headers: { 'accept': 'application/json' } }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, json: JSON.parse(data) });
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

function fetchHead(urlStr, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = urlStr.startsWith('https') ? https : http;
  const req = lib.request(urlStr, { method: 'GET', timeout: 5000, headers }, (res) => {
      const xSize = res.headers['x-response-bytes'];
      const cLen = res.headers['content-length'];
      const size = xSize ? Number(xSize) : (cLen ? Number(cLen) : NaN);
      resolve({ status: res.statusCode || 0, size });
      res.resume();
    });
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  // Warmup: wait for dev server to be ready (retry)
  const maxAttempts = 30;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.request(`${BASE}/`, { method: 'GET', timeout: 2000 }, (res) => {
          res.resume();
          resolve(undefined);
        });
        req.on('timeout', () => req.destroy(new Error('Warmup timeout')));
        req.on('error', reject);
        req.end();
      });
      break; // success
    } catch (e) {
      if (i === maxAttempts) {
        console.error(`[ERROR] Dev server warmup failed at ${BASE}/ after ${maxAttempts} attempts: ${e && e.message ? e.message : e}`);
      } else {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  // Build endpoints, with a dynamic job detail if available
  const endpoints = [
    { url: `${BASE}/api/jobs?select=basic&limit=10`, budget: 10_000 },
    { url: `${BASE}/api/freelancers?select=basic&limit=10`, budget: 10_000 },
  ];
  try {
    const { status, json } = await fetchJSON(`${BASE}/api/jobs?select=basic&limit=1`);
    if (status < 400 && json && json.jobs && json.jobs[0] && json.jobs[0].id) {
      const jobId = json.jobs[0].id;
      endpoints.push({ url: `${BASE}/api/jobs/${jobId}`, budget: 10_000 });
    }
  } catch {}

  // Try adding /api/profile (requires Authorization). If a token is available in env, include it.
  const devToken = process.env.PROFILE_BUDGET_BEARER || process.env.AUTH_BEARER || process.env.TOKEN || '';
  if (devToken) {
    endpoints.push({ url: `${BASE}/api/profile`, budget: 10_000, headers: { Authorization: `Bearer ${devToken}` } });
  } else {
    console.warn('[INFO] Skipping /api/profile budget: missing PROFILE_BUDGET_BEARER in env.');
  }

  let failed = 0;
  for (const ep of endpoints) {
    try {
      const { status, size } = await fetchHead(ep.url, ep.headers || {});
      if (status >= 400 || status === 0) {
        console.error(`[FAIL] ${ep.url} -> HTTP ${status}`);
        failed++;
        continue;
      }
      if (!Number.isFinite(size)) {
        console.warn(`[WARN] ${ep.url} -> size unknown (missing X-Response-Bytes/Content-Length)`);
        continue;
      }
      if (size > ep.budget) {
        console.error(`[FAIL] ${ep.url} -> ${size} bytes > budget ${ep.budget}`);
        failed++;
      } else {
        console.log(`[OK] ${ep.url} -> ${size} bytes (budget ${ep.budget})`);
      }
    } catch (e) {
      let msg = e && e.message ? e.message : String(e);
      if (e && e.name === 'AggregateError' && Array.isArray(e.errors)) {
        msg += ' | inner: ' + e.errors.map(er => er && er.message ? er.message : String(er)).join('; ');
      }
      console.error(`[ERROR] ${ep.url}: ${msg}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`Response size check failed for ${failed} endpoint(s).`);
    process.exit(1);
  }
})();
