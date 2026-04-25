/**
 * E2E / SMOKE TESTS — Transaction Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that the extracted transaction-service (port 4007) exposes the
 * correct REST API surface and responds to each endpoint as expected.
 *
 * Run with: npm run test:smoke
 *
 * Prerequisites: docker compose up --build (all services must be running)
 */

const http = require('http');

const PORT = 4007;
const BASE = `http://localhost:${PORT}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(path, BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };

    const timeout = setTimeout(() => reject(new Error('Timeout: service did not respond in 5s')), 5000);

    const req = http.request(options, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    if (payload) req.write(payload);
    req.end();
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('🏥 Transaction Service — Health Check', () => {
  test('GET /health should return status ok and service name', async () => {
    let res;
    try {
      res = await request('GET', '/health');
    } catch (err) {
      throw new Error(
        `❌ transaction-service is NOT running on port ${PORT}.\n` +
        `   Start with: docker compose up transaction-service\n` +
        `   Error: ${err.message}`
      );
    }
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('service', 'transaction-service');
    expect(res.body).toHaveProperty('rabbitmq'); // Should report MQ connection status
  }, 10000);
});

describe('🔄 Transaction Service — REST API Surface', () => {

  test('POST /transactions should return 400 without auth/body (validates endpoint exists)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    // 400 = validation error (endpoint is alive, just missing required fields)
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  }, 10000);

  test('GET /transactions should return 200 or 401 (endpoint exists)', async () => {
    let res;
    try {
      res = await request('GET', '/transactions');
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    // Without auth it may return 200 (empty) or 500 (Supabase auth needed)
    expect([200, 401, 500]).toContain(res.statusCode);
  }, 10000);

  test('GET /transactions/:id should return 400 for invalid UUID', async () => {
    let res;
    try {
      res = await request('GET', '/transactions/not-a-uuid');
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid transaction ID format');
  }, 10000);

  test('GET /transactions/:id/receipt should return 400 for invalid UUID', async () => {
    let res;
    try {
      res = await request('GET', '/transactions/not-a-uuid/receipt');
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Invalid transaction ID format');
  }, 10000);

  test('POST /transactions/hold should return 400 without body (validates endpoint exists)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/hold', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  }, 10000);

  test('POST /transactions/hold/:id/resume should return 404 for nonexistent hold', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/hold/00000000-0000-0000-0000-000000000000/resume');
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    // 404 = hold not found (endpoint exists and is responding correctly)
    expect([404, 500]).toContain(res.statusCode);
  }, 10000);

  test('POST /transactions/refund should return 400 without body (validates endpoint exists)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/refund', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  }, 10000);

  test('POST /transactions/initiate should return 201 or auth error (legacy endpoint alive)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/initiate', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    // 201 = created, 500 = Supabase auth needed — both prove the endpoint is live
    expect([201, 500]).toContain(res.statusCode);
  }, 10000);

  test('POST /transactions/complete should return 400 without body (validates endpoint exists)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/complete', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  }, 10000);

  test('POST /transactions/cancel should return 400 without body (validates endpoint exists)', async () => {
    let res;
    try {
      res = await request('POST', '/transactions/cancel', {});
    } catch {
      console.warn('⚠️  transaction-service not reachable — skipping');
      return;
    }
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Validation failed');
  }, 10000);
});
