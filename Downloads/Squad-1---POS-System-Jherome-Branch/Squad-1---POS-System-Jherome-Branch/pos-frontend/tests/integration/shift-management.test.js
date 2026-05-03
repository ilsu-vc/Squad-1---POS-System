/**
 * INTEGRATION TESTS — Shift Clock-In / Clock-Out with Real DB
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 310: POS-S4-015-T2 — Write integration tests for shift clock-in/out
 *
 * Tests POST /shift/clock-in and POST /shift/clock-out against the
 * REAL Supabase database via the auth-service.
 *
 * Edge cases covered:
 *   1. Successful clock-in → creates a shift record
 *   2. Duplicate clock-in → still succeeds (creates another record, as per current design)
 *   3. Missing/invalid userId → 400 validation error
 *   4. Successful clock-out → updates the shift with clock_out_at and handover notes
 *   5. Clock-out with missing shiftId → 400 validation error
 *   6. Active shift check → GET /shift/active/:userId returns the open shift
 */

const {
  AUTH_SERVICE_URL,
  getTestUser,
  cleanupShiftRecords,
  supabase,
} = require('./setup');

const BASE_URL = AUTH_SERVICE_URL;

// Track shift IDs for cleanup
const createdShiftIds = [];

// ── Teardown ─────────────────────────────────────────────────────────────────
afterAll(async () => {
  await cleanupShiftRecords(createdShiftIds);
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('POST /shift/clock-in — Shift Clock-In Edge Cases', () => {
  let testUserId;

  beforeAll(async () => {
    // Get any available user from the database for testing
    const user = await getTestUser();
    if (!user) {
      console.warn('⚠️ No test user found in user_profiles — some tests may be skipped');
    }
    testUserId = user?.id;

    // Force close any existing open shifts for this test user from previous failed test runs
    if (testUserId) {
      const { data: openShifts } = await supabase
        .from('shift_records')
        .select('id')
        .eq('user_id', testUserId)
        .is('clock_out_at', null);
      
      if (openShifts && openShifts.length > 0) {
        await cleanupShiftRecords(openShifts.map(s => s.id));
      }
    }
  });

  // ── Case 1: Successful clock-in ─────────────────────────────────────────
  test('should create a shift record on successful clock-in', async () => {
    if (!testUserId) return; // Skip if no test user

    const res = await fetch(`${BASE_URL}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shift).toBeDefined();
    expect(body.shift.user_id).toBe(testUserId);
    expect(body.shift.clock_in_at).toBeDefined();
    expect(body.shift.clock_out_at).toBeNull();

    // Track for cleanup
    createdShiftIds.push(body.shift.id);
  });

  // ── Case 2: Duplicate clock-in (second clock-in while first is open) ────
  test('should reject a second clock-in with 400 when one is already open', async () => {
    if (!testUserId) return;

    const res = await fetch(`${BASE_URL}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('User already has an open shift');
  });

  // ── Case 3: Missing userId → validation error ──────────────────────────
  test('should return 400 when userId is missing', async () => {
    const res = await fetch(`${BASE_URL}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  // ── Case 4: Invalid userId format → validation error ───────────────────
  test('should return 400 when userId is not a valid UUID', async () => {
    const res = await fetch(`${BASE_URL}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'not-a-uuid' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });
});

describe('POST /shift/clock-out — Shift Clock-Out Edge Cases', () => {
  let testUserId;
  let clockInShiftId;

  beforeAll(async () => {
    // Create a fresh clock-in for clock-out testing
    const user = await getTestUser();
    testUserId = user?.id;
    if (!testUserId) return;

    const res = await fetch(`${BASE_URL}/shift/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: testUserId }),
    });
    const body = await res.json();
    clockInShiftId = body.shift?.id;
    if (clockInShiftId) createdShiftIds.push(clockInShiftId);
  });

  // ── Case 5: Successful clock-out ────────────────────────────────────────
  test('should successfully clock out with handover notes', async () => {
    if (!clockInShiftId || !testUserId) return;

    const clockOutAt = new Date().toISOString();
    const res = await fetch(`${BASE_URL}/shift/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId: clockInShiftId,
        userId: testUserId,
        clockOutAt,
        totalHours: 8.5,
        handoverNotes: 'Integration test — shift completed without issues',
        cashDiscrepancies: 'None',
        issues: 'None',
        pendingItems: 'None',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  // ── Case 6: Clock-out with missing shiftId → validation error ──────────
  test('should return 400 when shiftId is missing', async () => {
    const res = await fetch(`${BASE_URL}/shift/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId || '00000000-0000-0000-0000-000000000000',
        clockOutAt: new Date().toISOString(),
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  // ── Case 7: Clock-out with missing clockOutAt → validation error ───────
  test('should return 400 when clockOutAt is missing', async () => {
    const res = await fetch(`${BASE_URL}/shift/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId: clockInShiftId || 1,
        userId: testUserId || '00000000-0000-0000-0000-000000000000',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });
});

describe('GET /shift/active/:userId — Active Shift Lookup', () => {
  // ── Case 8: Get active shift for a user ─────────────────────────────────
  test('should return active shift or null for a valid user', async () => {
    const user = await getTestUser();
    if (!user) return;

    const res = await fetch(`${BASE_URL}/shift/active/${user.id}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    // shift can be null (no active shift) or an object — both are valid
    expect(body).toHaveProperty('shift');
  });

  // ── Case 9: Invalid userId format → 400 ────────────────────────────────
  test('should return 400 for invalid userId format', async () => {
    const res = await fetch(`${BASE_URL}/shift/active/not-a-uuid`);
    expect(res.status).toBe(400);
  });
});
