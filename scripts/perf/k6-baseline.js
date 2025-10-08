import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% errors
    http_req_duration: ['p(95)<500'], // p95 < 500ms
  },
  scenarios: {
    list_endpoints_baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      gracefulStop: '5s',
    },
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('GET /api/jobs (basic)', () => {
    const res = http.get(`${BASE}/api/jobs?select=basic&limit=12`);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has jobs array': (r) => r.json('jobs') && Array.isArray(r.json('jobs')),
    });
  });

  group('GET /api/freelancers (basic)', () => {
    const res = http.get(`${BASE}/api/freelancers?select=basic&limit=12&sort=rating`);
    check(res, {
      'status is 200': (r) => r.status === 200,
      'has freelancers array': (r) => r.json('freelancers') && Array.isArray(r.json('freelancers')),
    });
  });

  sleep(1);
}
