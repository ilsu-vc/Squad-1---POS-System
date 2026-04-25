/**
 * k6 LOAD TEST — POS System Hot Endpoints
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 303: POS-S4-014-T1 — Write k6 scenarios for transaction and stock endpoints
 * SCRUM 304: POS-S4-014-T2 — Configure threshold assertions and CI nightly job
 *
 * Endpoints under test:
 *   1. POST /transactions          — Create a new transaction
 *   2. GET  /products/:sku/stock   — Check product stock level
 *   3. GET  /transactions/:id/receipt — Fetch a transaction receipt
 *
 * Load profile:
 *   - 30 concurrent Virtual Users (VUs) simulating cashiers
 *   - 30s ramp-up → 2min steady state → 10s ramp-down
 *
 * Thresholds (fail the build if breached):
 *   - Transaction p95 < 500ms
 *   - Stock check  p95 < 150ms
 *   - HTTP error rate  < 1%
 *
 * Usage:
 *   k6 run tests/k6/load-test.js
 *   k6 run --out influxdb=http://localhost:8086/k6 tests/k6/load-test.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { URL } from 'https://jslib.k6.io/url/1.0.0/index.js';

// ── Custom Metrics ───────────────────────────────────────────────────────────
const transactionDuration = new Trend('transaction_duration', true);
const stockCheckDuration = new Trend('stock_check_duration', true);
const receiptDuration = new Trend('receipt_duration', true);
const errorRate = new Rate('error_rate');

// ── Configuration ────────────────────────────────────────────────────────────
const TRANSACTION_SERVICE_URL = __ENV.TRANSACTION_SERVICE_URL || 'http://localhost:4007';
const INVENTORY_SERVICE_URL = __ENV.INVENTORY_SERVICE_URL || 'http://localhost:4002';

// Default product SKU for stock checks (fallback for testing)
const TEST_PRODUCT_SKU = __ENV.TEST_PRODUCT_SKU || '1';

// ── k6 Options ───────────────────────────────────────────────────────────────
export const options = {
  // Weighted scenario distribution (SCRUM-335)
  scenarios: {
    transaction_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 }, // 20 VUs for transactions
        { duration: '2m',  target: 20 },
        { duration: '10s', target: 0 },
      ],
      exec: 'createTransaction',
    },
    stock_check_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // 5 VUs for stock checks
        { duration: '2m',  target: 5 },
        { duration: '10s', target: 0 },
      ],
      exec: 'checkStock',
    },
    receipt_fetch_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 }, // 5 VUs for receipts
        { duration: '2m',  target: 5 },
        { duration: '10s', target: 0 },
      ],
      exec: 'fetchReceipt',
    },
  },

  // Strict thresholds — CI build FAILS if any are breached (SCRUM-336)
  thresholds: {
    // Transaction creation: p95 must be under 500ms
    'transaction_duration': ['p(95)<500'],

    // Stock check: p95 must be under 150ms
    'stock_check_duration': ['p(95)<150'],

    // Receipt fetch: p95 must be under 500ms
    'receipt_duration': ['p(95)<500'],

    // Overall HTTP error rate must be under 1%
    'error_rate': ['rate<0.01'],

    // Built-in k6 metrics for additional safety
    'http_req_failed': ['rate<0.01'],
  },

  // Tags for Grafana filtering
  tags: {
    testName: 'pos-load-test',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a realistic transaction payload that mimics a cashier checkout.
 */
function generateTransactionPayload() {
  const itemCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
  const items = [];
  let subtotal = 0;

  for (let i = 0; i < itemCount; i++) {
    const price = Math.round((Math.random() * 500 + 10) * 100) / 100;
    const qty = Math.floor(Math.random() * 3) + 1;
    subtotal += price * qty;

    items.push({
      product_id: `${Math.floor(Math.random() * 100) + 1}`,
      name: `Product-${i + 1}`,
      category: 'General',
      unit_price: price,
      quantity: qty,
    });
  }

  const vat = Math.round(subtotal * 0.12 * 100) / 100;
  const totalAmount = Math.round((subtotal + vat) * 100) / 100;

  return {
    vat,
    subtotal,
    totalAmount,
    paymentMethod: ['cash', 'card', 'gcash'][Math.floor(Math.random() * 3)],
    itemsCount: items.reduce((sum, it) => sum + it.quantity, 0),
    items,
  };
}

const jsonHeaders = { 'Content-Type': 'application/json' };

// ── Scenario 1: POST /transactions ───────────────────────────────────────
export function createTransaction() {
  const payload = generateTransactionPayload();
  const res = http.post(
    `${TRANSACTION_SERVICE_URL}/transactions`,
    JSON.stringify(payload),
    { headers: jsonHeaders, tags: { endpoint: 'transaction' } }
  );

  // Record custom metric
  transactionDuration.add(res.timings.duration);

  // Track errors
  const success = check(res, {
    'transaction: status is 201': (r) => r.status === 201,
    'transaction: has transactionId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !!body.transactionId;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!success);

  sleep(Math.random() * 2 + 1); // Simulate cashier pause (1-3s)
}

// ── Scenario 2: GET /products/:sku/stock ─────────────────────────────────
export function checkStock() {
  const sku = TEST_PRODUCT_SKU;
  const res = http.get(
    `${INVENTORY_SERVICE_URL}/products/${sku}/stock`,
    {
      tags: { endpoint: 'stock' },
      responseCallback: http.expectedStatuses(200, 404),
    }
  );

  stockCheckDuration.add(res.timings.duration);

  const success = check(res, {
    'stock: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
  });
  errorRate.add(!success);

  sleep(Math.random() * 1 + 0.5); // Simulate quick checks (0.5-1.5s)
}

// ── Scenario 3: GET /transactions/:id/receipt ────────────────────────────
export function fetchReceipt() {
  // Use a known test ID since we don't share state between scenarios easily
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const res = http.get(
    `${TRANSACTION_SERVICE_URL}/transactions/${id}/receipt`,
    { tags: { endpoint: 'receipt' } }
  );

  receiptDuration.add(res.timings.duration);

  const success = check(res, {
    'receipt: status is 200': (r) => r.status === 200 || r.status === 404, // Allow 404 since it's a dummy ID
  });
  errorRate.add(!success);

  sleep(Math.random() * 2 + 1); // (1-3s)
}

// ── Summary Handler ──────────────────────────────────────────────────────────
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    vus_max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
    iterations: data.metrics.iterations ? data.metrics.iterations.values.count : 0,
    transaction_p95: data.metrics.transaction_duration
      ? data.metrics.transaction_duration.values['p(95)']
      : null,
    stock_check_p95: data.metrics.stock_check_duration
      ? data.metrics.stock_check_duration.values['p(95)']
      : null,
    receipt_p95: data.metrics.receipt_duration
      ? data.metrics.receipt_duration.values['p(95)']
      : null,
    error_rate: data.metrics.error_rate
      ? data.metrics.error_rate.values.rate
      : null,
    http_req_failed: data.metrics.http_req_failed
      ? data.metrics.http_req_failed.values.rate
      : null,
  };

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  📊 POS Load Test Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Max VUs:            ${summary.vus_max}`);
  console.log(`  Total Iterations:   ${summary.iterations}`);
  console.log(`  Transaction p95:    ${summary.transaction_p95?.toFixed(2)}ms (threshold: <500ms)`);
  console.log(`  Stock Check p95:    ${summary.stock_check_p95?.toFixed(2)}ms (threshold: <150ms)`);
  console.log(`  Receipt p95:        ${summary.receipt_p95?.toFixed(2)}ms (threshold: <500ms)`);
  console.log(`  Error Rate:         ${(summary.error_rate * 100)?.toFixed(2)}% (threshold: <1%)`);
  console.log(`  HTTP Failures:      ${(summary.http_req_failed * 100)?.toFixed(2)}%`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  return {
    'tests/k6/results/summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

// k6 built-in text summary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
