/*
  CI script: Fetch key endpoints and assert response payload size budgets using X-Response-Bytes.
  Usage: node scripts/check-response-sizes.ts
*/
import http from 'http';
import https from 'https';

const ENDPOINTS: { url: string; budget: number; }[] = [
  { url: 'http://localhost:3000/api/jobs?select=basic&limit=10', budget: 80_000 },
  { url: 'http://localhost:3000/api/freelancers?select=basic&limit=10', budget: 80_000 },
];

function fetchHead(urlStr: string): Promise<{ status: number; size: number; }> {
  return new Promise((resolve, reject) => {
    const lib = urlStr.startsWith('https') ? https : http;
    const req = lib.request(urlStr, { method: 'GET' }, (res) => {
      // Prefer header when our API sets X-Response-Bytes; fallback to content-length
      const xSize = res.headers['x-response-bytes'];
      const cLen = res.headers['content-length'];
      const size = xSize ? Number(xSize) : (cLen ? Number(cLen) : NaN);
      resolve({ status: res.statusCode || 0, size });
      res.resume(); // discard body
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  let failed = 0;
  for (const ep of ENDPOINTS) {
    try {
      const { status, size } = await fetchHead(ep.url);
      if (status >= 400) {
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
    } catch (e: any) {
      console.error(`[ERROR] ${ep.url}: ${e.message}`);
      failed++;
    }
  }
  if (failed) {
    console.error(`Response size check failed for ${failed} endpoint(s).`);
    process.exit(1);
  }
})();
