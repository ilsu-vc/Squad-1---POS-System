/**
 * API Configuration
 *
 * Change API_BASE_URL to your computer's local network IP address.
 * Find it by running `ipconfig` in your terminal and looking for
 * "IPv4 Address" under your WiFi adapter.
 *
 * The tablet must be on the same WiFi network as your computer.
 */

// ─── Local API Base URL ─────────────────────────────────────────────────────
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// ─── Supabase Configuration ─────────────────────────────────────────────────
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
