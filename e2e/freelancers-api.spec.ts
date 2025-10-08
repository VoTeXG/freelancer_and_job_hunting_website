import { test, expect } from '@playwright/test';

const base = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Freelancers API', () => {
  test('basic listing with select=basic', async ({ request }) => {
    const res = await request.get(`${base}/api/freelancers?select=basic&limit=5`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(Array.isArray(json.freelancers)).toBeTruthy();
    if (json.freelancers.length) {
      const f = json.freelancers[0];
      expect(f).toHaveProperty('id');
      expect(f).toHaveProperty('username');
      expect(f).toHaveProperty('title');
      expect(f).toHaveProperty('reputation');
      expect(f).toHaveProperty('hourlyRate');
      expect(f).toHaveProperty('skills');
    }
  });

  test('sort permutations: rating, rate, experience, recent', async ({ request }) => {
    for (const sort of ['rating', 'rate', 'experience', 'recent']) {
      const res = await request.get(`${base}/api/freelancers?select=basic&limit=5&sort=${sort}`);
      expect(res.ok()).toBeTruthy();
      const json = await res.json();
      expect(json.success).toBeTruthy();
      expect(Array.isArray(json.freelancers)).toBeTruthy();
    }
  });

  test('filters: skills, rate, experience, rating', async ({ request }) => {
    const qs = new URLSearchParams({
      select: 'basic',
      limit: '5',
      skills: 'react,typescript',
      minRate: '10',
      maxRate: '500',
      minExperience: '0',
      minRating: '0',
    });
    const res = await request.get(`${base}/api/freelancers?${qs.toString()}`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBeTruthy();
    expect(Array.isArray(json.freelancers)).toBeTruthy();
  });
});
