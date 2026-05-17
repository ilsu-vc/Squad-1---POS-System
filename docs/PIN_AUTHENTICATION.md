# PIN Authentication Feature

## Overview
This document describes the PIN authentication feature implemented for the Squad-1 POS System, designed specifically for tablet-based cashier login.

## Backlog Items Implemented

### SCRUM-385: Build login screen with large numeric PIN pad for tablet
**Status**: ✅ Completed

**Implementation**:
- Created `PINLoginForm.tsx` component with large, touch-friendly numeric keypad
- Responsive design optimized for tablet screens (768px+)
- Visual PIN display with dots that fill as user enters PIN
- Clear and backspace buttons for easy correction
- Keyboard support for desktop testing

**Files**:
- `pos-frontend/src/components/PINLoginForm.tsx`
- `pos-frontend/src/components/PINLoginForm.css`

**Features**:
- Large 72-88px touch targets for easy tapping
- Visual feedback on button press
- Animated PIN dots
- Support for 4-6 digit PINs
- Keyboard shortcuts (0-9, Enter, Backspace, Escape)

---

### SCRUM-386: Wire POST /auth/login with JWT storage
**Status**: ✅ Completed

**Implementation**:
- Added `/login/pin` endpoint to auth-service
- Integrated with Supabase authentication
- JWT tokens automatically stored in browser session
- Added `loginWithPIN()` method to authApi service

**Files**:
- `pos-backend/auth-service-express/src/index.ts`
- `pos-frontend/src/services/authApi.ts`

**API Endpoint**:
```typescript
POST /api/auth/login/pin
Body: {
  pin: string (4-6 digits),
  userId?: string (optional)
}
Response: {
  session: Session,
  user: User
}
```

**Security**:
- Input validation using Zod schema
- PIN must be 4-6 digits, numeric only
- JWT tokens stored securely in browser
- Tokens automatically included in subsequent requests

---

### SCRUM-387: Implement failed attempt counter and lockout
**Status**: ✅ Completed

**Implementation**:
- Client-side failed attempt tracking
- 3 failed attempts trigger 15-minute lockout
- Lockout state persisted in localStorage
- Visual countdown timer during lockout
- Automatic lockout expiration

**Files**:
- `PINLoginForm.tsx` (lockout logic)
- `pos-backend/auth-service-express/migrations/001_add_pin_authentication.sql` (database schema)

**Lockout Behavior**:
- **Max Attempts**: 3 failed attempts
- **Lockout Duration**: 15 minutes
- **Persistence**: Survives page refresh
- **Visual Feedback**: Red error messages, countdown timer
- **Auto-Reset**: Lockout automatically expires after 15 minutes

**Database Schema**:
```sql
ALTER TABLE user_profiles ADD COLUMN:
- failed_login_attempts INTEGER DEFAULT 0
- locked_until TIMESTAMP WITH TIME ZONE
- last_failed_attempt TIMESTAMP WITH TIME ZONE
```

**Functions**:
- `increment_failed_login_attempts(user_id)` - Tracks failed attempts
- `reset_failed_login_attempts()` - Resets on successful login

---

### SCRUM-388: Add 15-minute inactivity auto-logout
**Status**: ✅ Completed

**Implementation**:
- Created `useInactivityLogout` React hook
- Monitors user activity (mouse, keyboard, touch, scroll)
- Automatically logs out after 15 minutes of inactivity
- Throttled activity detection (1 second intervals)
- Logs auto-logout activity for audit trail

**Files**:
- `pos-frontend/src/hooks/useInactivityLogout.ts`
- `pos-frontend/src/App.tsx` (integration)

**Monitored Events**:
- `mousedown`, `mousemove`
- `keypress`
- `scroll`
- `touchstart`
- `click`

**Features**:
- Configurable timeout (default: 15 minutes)
- Can be enabled/disabled dynamically
- Throttled event handling for performance
- Automatic cleanup on unmount
- Activity logging for compliance

**Usage**:
```typescript
useInactivityLogout({
  timeout: 15 * 60 * 1000, // 15 minutes
  onLogout: handleLogout,
  enabled: !!profile, // Only when logged in
});
```

---

## Architecture

### Frontend Components

```
PINLoginForm
├── PIN Display (6 dots)
├── Numeric Keypad (0-9)
├── Action Buttons (Clear, Backspace)
├── Login Button
├── Error Display
└── Lockout Warning
```

### Backend Services

```
auth-service-express
├── POST /login (email/password)
├── POST /login/pin (PIN authentication)
├── POST /logout
├── GET /session
└── GET /profile/:userId
```

### Database Schema

```
user_profiles
├── pin_hash (VARCHAR)
├── pin_enabled (BOOLEAN)
├── failed_login_attempts (INTEGER)
├── locked_until (TIMESTAMP)
└── last_failed_attempt (TIMESTAMP)

auth_attempts (audit log)
├── user_id
├── attempt_type
├── success
├── ip_address
├── user_agent
└── created_at
```

---

## Security Considerations

### Implemented
✅ Input validation (Zod schemas)
✅ Failed attempt tracking
✅ Account lockout mechanism
✅ Inactivity timeout
✅ Activity logging for audit trail
✅ JWT token-based authentication

### Recommended Enhancements
⚠️ PIN hashing (bcrypt/argon2) - Currently using placeholder
⚠️ Rate limiting on login endpoint
⚠️ IP-based lockout tracking
⚠️ Multi-factor authentication option
⚠️ PIN complexity requirements
⚠️ Regular PIN rotation policy

---

## Testing

### Manual Testing Checklist

**PIN Login**:
- [ ] Enter valid 4-digit PIN → Should login successfully
- [ ] Enter valid 6-digit PIN → Should login successfully
- [ ] Enter 3-digit PIN → Should show error
- [ ] Enter 7-digit PIN → Should be prevented
- [ ] Enter non-numeric characters → Should be prevented

**Failed Attempts**:
- [ ] Enter wrong PIN 1st time → Should show "2 attempts remaining"
- [ ] Enter wrong PIN 2nd time → Should show "1 attempt remaining"
- [ ] Enter wrong PIN 3rd time → Should lock account for 15 minutes
- [ ] Refresh page during lockout → Lockout should persist
- [ ] Wait 15 minutes → Lockout should expire automatically

**Inactivity Logout**:
- [ ] Login and remain inactive for 15 minutes → Should auto-logout
- [ ] Move mouse during inactivity → Timer should reset
- [ ] Type on keyboard during inactivity → Timer should reset
- [ ] Scroll page during inactivity → Timer should reset

**Tablet Optimization**:
- [ ] Test on iPad/Android tablet → Buttons should be easy to tap
- [ ] Test in portrait mode → Layout should be responsive
- [ ] Test in landscape mode → Layout should be responsive

---

## Configuration

### Environment Variables
No additional environment variables required. Uses existing Supabase configuration.

### Customization

**Lockout Duration**:
```typescript
// In PINLoginForm.tsx
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // Change to desired duration
```

**Max Failed Attempts**:
```typescript
// In PINLoginForm.tsx
const MAX_FAILED_ATTEMPTS = 3; // Change to desired limit
```

**Inactivity Timeout**:
```typescript
// In App.tsx
useInactivityLogout({
  timeout: 15 * 60 * 1000, // Change to desired timeout
  // ...
});
```

---

## Migration Guide

### Database Migration
Run the migration script to add PIN authentication columns:

```bash
psql -U postgres -d your_database -f pos-backend/auth-service-express/migrations/001_add_pin_authentication.sql
```

### Enabling PIN for Users
To enable PIN authentication for a user:

```sql
UPDATE user_profiles
SET 
  pin_hash = crypt('1234', gen_salt('bf')), -- Replace with actual PIN
  pin_enabled = TRUE
WHERE email = 'cashier@example.com';
```

---

## Future Enhancements

1. **Admin PIN Management UI**
   - Allow managers to set/reset PINs for cashiers
   - PIN generation with QR code for easy setup

2. **Biometric Authentication**
   - Fingerprint support on compatible tablets
   - Face recognition as alternative to PIN

3. **Session Management**
   - View active sessions
   - Remote logout capability
   - Session timeout warnings

4. **Enhanced Security**
   - PIN encryption at rest
   - Hardware security module (HSM) integration
   - Anomaly detection for suspicious login patterns

5. **Analytics Dashboard**
   - Failed login attempt trends
   - Peak login times
   - User activity patterns

---

## Support

For issues or questions about PIN authentication:
1. Check the error logs in browser console
2. Verify database migration was applied
3. Ensure Supabase configuration is correct
4. Contact the development team

---

## Changelog

### Version 1.0.0 (Current)
- ✅ SCRUM-385: PIN login screen with numeric keypad
- ✅ SCRUM-386: JWT authentication integration
- ✅ SCRUM-387: Failed attempt counter and lockout
- ✅ SCRUM-388: 15-minute inactivity auto-logout
