/**
 * SMOKE TESTS — POS Microservices
 * ─────────────────────────────────────────────────────────────────────────────
 * Verifies that all 6 microservices are reachable and responding correctly.
 * Run with: npm run test:smoke
 *
 * These tests do NOT require microservices to be running in Docker.
 * They call the /health endpoint of each service directly.
 *
 * If a service is not running, the test will fail gracefully with a message.
 */

const http = require('http');

const SERVICES = [
  { name: 'auth-service',        port: 4001 },
  { name: 'inventory-service',   port: 4002 },
  { name: 'sales-service',       port: 4003 },
  { name: 'reporting-service',   port: 4004 },
  { name: 'role-service',        port: 4005 },
  { name: 'receipt-service',     port: 4006 },
  { name: 'transaction-service', port: 4007 },
];

/**
 * Pings a /health endpoint on a given port.
 * @returns {Promise<object>} Parsed JSON response.
 */
function ping(port) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timeout: service did not respond in 3s')), 3000);
    http.get(`http://localhost:${port}/health`, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse response from port ${port}`));
        }
      });
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe('🔥 Smoke Tests — All Microservices Health', () => {
  for (const svc of SERVICES) {
    test(`${svc.name} (port ${svc.port}) should respond with status: ok`, async () => {
      let result;
      try {
        result = await ping(svc.port);
      } catch (err) {
        throw new Error(
          `❌ ${svc.name} is NOT running on port ${svc.port}.\n` +
          `   Start it first, or run: docker compose up ${svc.name}\n` +
          `   Original error: ${err.message}`
        );
      }
      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('service', svc.name);
    }, 5000); // 5s timeout per service
  }
});
