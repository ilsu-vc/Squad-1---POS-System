/**
 * TEST DB SETUP — Supabase Seed & Teardown Hooks
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 311: POS-S4-015-T3 — Set up test DB seed and teardown hooks
 *
 * Provides helper functions to:
 *   - Connect to Supabase using the shared anon key
 *   - Seed test data into discount_codes and shift_records tables
 *   - Clean up all test data by a unique test-run marker
 *
 * IMPORTANT: This file uses the REAL Supabase database.
 * All test records are tagged with a unique testRunId so they can be
 * reliably cleaned up without affecting production data.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env from the project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Sanitize Environment Variables ───────────────────────────────────────────
// Strips leading/trailing whitespace and quotes that might leak from CI/Shells
if (SUPABASE_URL) {
  SUPABASE_URL = SUPABASE_URL.trim().replace(/^["'](.+)["']$/, '$1');
}
if (SUPABASE_KEY) {
  SUPABASE_KEY = SUPABASE_KEY.trim().replace(/^["'](.+)["']$/, '$1');
}

// ── Validation ───────────────────────────────────────────────────────────────
if (!SUPABASE_URL || SUPABASE_URL === '' || SUPABASE_URL === 'undefined') {
  throw new Error(
    '❌ [Test Setup] NEXT_PUBLIC_SUPABASE_URL is missing or invalid. ' + 
    'Ensure it is set in .env or as a GitHub Secret.'
  );
}

if (!SUPABASE_URL.startsWith('http://') && !SUPABASE_URL.startsWith('https://')) {
  throw new Error(
    `❌ [Test Setup] NEXT_PUBLIC_SUPABASE_URL does not start with http/https. ` +
    `Value starts with: "${SUPABASE_URL.substring(0, 5)}..."`
  );
}

if (!SUPABASE_KEY || SUPABASE_KEY === '' || SUPABASE_KEY === 'undefined') {
  throw new Error('❌ [Test Setup] NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or invalid.');
}

// Service-level Supabase client (anon key, no user JWT)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Unique Test Run ID ───────────────────────────────────────────────────────
// Each test run gets a unique marker so cleanup only removes THIS run's data.
const TEST_RUN_ID = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Service URLs ─────────────────────────────────────────────────────────────
const TRANSACTION_SERVICE_URL = process.env.TRANSACTION_SERVICE_URL || 'http://localhost:4007';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';

// ── Seed Data Factories ──────────────────────────────────────────────────────

/**
 * Seed a discount code into the database.
 * Returns the inserted record.
 */
async function seedDiscountCode(overrides = {}) {
  const code = `TEST_${TEST_RUN_ID}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
  const record = {
    code,
    type: 'percentage',
    value: 10,
    description: `Integration test discount [${TEST_RUN_ID}]`,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // expires tomorrow
    max_uses: 100,
    times_used: 0,
    requires_supervisor: false,
    min_cart_total: 0,
    max_discount: null,
    is_active: true,
    ...overrides,
  };

  const { data, error } = await supabase
    .from('discount_codes')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to seed discount code:', error.message);
    throw error;
  }
  return data;
}

/**
 * Seed a shift-record (clock-in) into the database.
 */
async function seedShiftRecord(userId, overrides = {}) {
  const record = {
    user_id: userId,
    clock_in_at: new Date().toISOString(),
    ...overrides,
  };

  const { data, error } = await supabase
    .from('shift_records')
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error('Failed to seed shift record:', error.message);
    throw error;
  }
  return data;
}

// ── Teardown Helpers ─────────────────────────────────────────────────────────

/**
 * Remove discount codes created during this test run.
 */
async function cleanupDiscountCodes() {
  const { error } = await supabase
    .from('discount_codes')
    .delete()
    .like('description', `%${TEST_RUN_ID}%`);

  if (error) {
    console.error('Cleanup discount_codes failed:', error.message);
  }
}

/**
 * Remove shift records by their IDs.
 */
async function cleanupShiftRecords(shiftIds = []) {
  if (shiftIds.length === 0) return;

  const { error } = await supabase
    .from('shift_records')
    .delete()
    .in('id', shiftIds);

  if (error) {
    console.error('Cleanup shift_records failed:', error.message);
  }
}

/**
 * Fetch a known test user from user_profiles (first available).
 * Returns { id, email, role } or null.
 */
async function getTestUser(role = null) {
  let query = supabase.from('user_profiles').select('id, email, role').limit(1);
  if (role) {
    query = query.ilike('role', role);
  }
  const { data } = await query.maybeSingle();
  return data;
}

module.exports = {
  supabase,
  TEST_RUN_ID,
  TRANSACTION_SERVICE_URL,
  AUTH_SERVICE_URL,
  seedDiscountCode,
  seedShiftRecord,
  cleanupDiscountCodes,
  cleanupShiftRecords,
  getTestUser,
};
