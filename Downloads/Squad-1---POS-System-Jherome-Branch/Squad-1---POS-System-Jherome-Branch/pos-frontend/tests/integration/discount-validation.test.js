/**
 * INTEGRATION TESTS — Discount Validation Edge Cases
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 309: POS-S4-015-T1 — Write integration tests for discount validation
 *
 * Tests POST /discounts/validate against the REAL Supabase database.
 * Each test seeds its own data and cleans up after itself.
 *
 * Edge cases covered:
 *   1. Valid discount code → 200 with computed discount
 *   2. Expired discount code → 400 EXPIRED
 *   3. Over-limit (max_uses exceeded) → 400 OVER_LIMIT
 *   4. Supervisor-required without supervisor → 403 SUPERVISOR_REQUIRED
 *   5. Invalid/nonexistent code → 404 INVALID_CODE
 *   6. Missing required fields → 400 validation error
 */

const {
  TRANSACTION_SERVICE_URL,
  seedDiscountCode,
  cleanupDiscountCodes,
} = require('./setup');

const BASE_URL = TRANSACTION_SERVICE_URL;

// ── Teardown ─────────────────────────────────────────────────────────────────
afterAll(async () => {
  await cleanupDiscountCodes();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /discounts/validate — Discount Validation Edge Cases', () => {

  // ── Case 1: Valid discount code ──────────────────────────────────────────
  test('should return 200 and computed discount for a valid code', async () => {
    const discount = await seedDiscountCode({
      type: 'percentage',
      value: 15,
    });

    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discount.code, cartTotal: 1000 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount.code).toBe(discount.code);
    expect(body.discount.type).toBe('percentage');
    expect(body.discount.computedDiscount).toBe(150); // 15% of 1000
  });

  // ── Case 2: Fixed-amount discount ────────────────────────────────────────
  test('should return correct computed discount for fixed-amount type', async () => {
    const discount = await seedDiscountCode({
      type: 'fixed',
      value: 50,
    });

    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discount.code, cartTotal: 500 }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.valid).toBe(true);
    expect(body.discount.computedDiscount).toBe(50);
  });

  // ── Case 3: Expired discount code ────────────────────────────────────────
  test('should return 400 EXPIRED for an expired discount code', async () => {
    const discount = await seedDiscountCode({
      expires_at: new Date('2020-01-01').toISOString(), // expired in the past
    });

    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discount.code, cartTotal: 1000 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.reason).toBe('EXPIRED');
  });

  // ── Case 4: Over-limit (max_uses exceeded) ──────────────────────────────
  test('should return 400 OVER_LIMIT when max uses reached', async () => {
    const discount = await seedDiscountCode({
      max_uses: 5,
      times_used: 5, // already used 5 times — limit reached
    });

    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discount.code, cartTotal: 1000 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.reason).toBe('OVER_LIMIT');
  });

  // ── Case 5: Supervisor-required without cashierId ────────────────────────
  test('should return 403 SUPERVISOR_REQUIRED when no cashierId provided', async () => {
    const discount = await seedDiscountCode({
      requires_supervisor: true,
    });

    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: discount.code, cartTotal: 1000 }),
      // No cashierId provided
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.reason).toBe('SUPERVISOR_REQUIRED');
  });

  // ── Case 6: Invalid / nonexistent code ──────────────────────────────────
  test('should return 404 INVALID_CODE for a nonexistent code', async () => {
    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DOESNOTEXIST999', cartTotal: 100 }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.valid).toBe(false);
    expect(body.reason).toBe('INVALID_CODE');
  });

  // ── Case 7: Missing required fields ─────────────────────────────────────
  test('should return 400 validation error when code is missing', async () => {
    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartTotal: 100 }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  test('should return 400 validation error when cartTotal is missing', async () => {
    const res = await fetch(`${BASE_URL}/discounts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'TESTCODE' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });
});
