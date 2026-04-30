# Integration Guide: PIN Authentication

## Quick Start

This guide shows you how to integrate the new PIN authentication feature into your POS system.

---

## Option 1: Replace Existing Login (Recommended for Tablets)

If you want to use PIN login as the primary authentication method:

### Step 1: Update App.tsx or page.tsx

```typescript
import LoginForm from './components/LoginForm'; // Old
import PINLoginForm from './components/PINLoginForm'; // New

// Replace this:
if (authError === 'Auth session missing!' || (!profile && !authError)) {
  return <LoginForm />;
}

// With this:
if (authError === 'Auth session missing!' || (!profile && !authError)) {
  return <PINLoginForm />;
}
```

---

## Option 2: Add PIN Login as Alternative

If you want to offer both email/password and PIN login:

### Step 1: Create a Login Selector Component

```typescript
// src/components/LoginSelector.tsx
import { useState } from 'react';
import LoginForm from './LoginForm';
import PINLoginForm from './PINLoginForm';

const LoginSelector: React.FC = () => {
  const [loginMethod, setLoginMethod] = useState<'email' | 'pin'>('pin');

  return (
    <div>
      {loginMethod === 'pin' ? (
        <>
          <PINLoginForm />
          <button onClick={() => setLoginMethod('email')}>
            Use Email/Password Instead
          </button>
        </>
      ) : (
        <>
          <LoginForm />
          <button onClick={() => setLoginMethod('pin')}>
            Use PIN Instead
          </button>
        </>
      )}
    </div>
  );
};

export default LoginSelector;
```

### Step 2: Use LoginSelector in App

```typescript
import LoginSelector from './components/LoginSelector';

if (authError === 'Auth session missing!' || (!profile && !authError)) {
  return <LoginSelector />;
}
```

---

## Option 3: Role-Based Login Method

Show PIN login for cashiers, email/password for managers:

```typescript
import LoginForm from './components/LoginForm';
import PINLoginForm from './components/PINLoginForm';

// Detect user role from URL or localStorage
const userRole = new URLSearchParams(window.location.search).get('role') || 'cashier';

if (authError === 'Auth session missing!' || (!profile && !authError)) {
  return userRole === 'cashier' ? <PINLoginForm /> : <LoginForm />;
}
```

---

## Setting Up User PINs

### Method 1: Direct Database Update (Development)

```sql
-- Enable PIN for a user
UPDATE user_profiles
SET 
  pin_hash = crypt('1234', gen_salt('bf')),
  pin_enabled = TRUE
WHERE email = 'cashier@example.com';
```

### Method 2: Admin UI (Future Enhancement)

Create an admin interface to manage PINs:

```typescript
// Example admin function
async function setUserPIN(userId: string, pin: string) {
  const response = await fetch('/api/auth/admin/set-pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pin }),
  });
  return response.json();
}
```

---

## Customizing the PIN Login

### Change Lockout Settings

```typescript
// In PINLoginForm.tsx
const MAX_FAILED_ATTEMPTS = 5; // Change from 3 to 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // Change from 15 to 30 minutes
```

### Change PIN Length

```typescript
// In PINLoginForm.tsx
// Current: 4-6 digits
// To allow 6-8 digits:

const handleNumberClick = (num: string) => {
  if (pin.length < 8) { // Change from 6 to 8
    setPin(pin + num);
  }
};

// Update validation:
if (pin.length < 6) { // Change from 4 to 6
  setError('PIN must be at least 6 digits');
  return;
}
```

### Customize Appearance

```css
/* In PINLoginForm.css */

/* Change button size */
.pin-key {
  height: 100px; /* Increase from 72px */
  font-size: 32px; /* Increase from 24px */
}

/* Change color scheme */
.pin-login-logo {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
}
```

---

## Inactivity Logout Configuration

### Change Timeout Duration

```typescript
// In App.tsx
useInactivityLogout({
  timeout: 30 * 60 * 1000, // Change from 15 to 30 minutes
  onLogout: handleLogout,
  enabled: !!profile,
});
```

### Disable for Specific Roles

```typescript
// Only enable for cashiers
useInactivityLogout({
  timeout: 15 * 60 * 1000,
  onLogout: handleLogout,
  enabled: !!profile && profile.role === 'cashier',
});
```

### Add Warning Before Logout

```typescript
const [showWarning, setShowWarning] = useState(false);

useInactivityLogout({
  timeout: 14 * 60 * 1000, // 14 minutes
  onLogout: () => {
    setShowWarning(true);
    // Give user 1 minute to respond
    setTimeout(() => {
      if (showWarning) {
        handleLogout();
      }
    }, 60 * 1000);
  },
  enabled: !!profile,
});
```

---

## Testing the Integration

### 1. Test PIN Login

```bash
# Start the backend
cd pos-backend/auth-service-express
npm start

# Start the frontend
cd pos-frontend
npm start

# Navigate to http://localhost:3000
# Enter a 4-digit PIN (e.g., 1234)
```

### 2. Test Failed Attempts

1. Enter wrong PIN 3 times
2. Verify account is locked
3. Verify countdown timer appears
4. Wait 15 minutes or clear localStorage
5. Try again

### 3. Test Inactivity Logout

1. Login successfully
2. Don't interact with the app for 15 minutes
3. Verify automatic logout occurs
4. Check console for "AUTO_LOGOUT" activity log

### 4. Test on Tablet

1. Open on iPad or Android tablet
2. Verify buttons are easy to tap
3. Test in portrait and landscape modes
4. Verify touch feedback works

---

## Troubleshooting

### Issue: PIN login not working

**Solution**:
1. Check backend is running: `http://localhost:4001/health`
2. Check browser console for errors
3. Verify Supabase configuration in `.env`
4. Check network tab for failed requests

### Issue: Lockout not persisting

**Solution**:
1. Check localStorage is enabled in browser
2. Verify localStorage keys: `pin_lockout_end`, `pin_failed_attempts`
3. Clear localStorage and try again

### Issue: Inactivity logout not working

**Solution**:
1. Check if hook is enabled: `enabled: !!profile`
2. Verify timeout value is correct
3. Check console for activity logs
4. Ensure no errors in browser console

### Issue: Buttons too small on tablet

**Solution**:
1. Check CSS media queries in `PINLoginForm.css`
2. Increase button size in tablet breakpoint
3. Test on actual device, not just browser resize

---

## Migration Checklist

Before deploying to production:

- [ ] Run database migration
- [ ] Set up PINs for all cashier users
- [ ] Test PIN login on actual tablets
- [ ] Test failed attempt lockout
- [ ] Test inactivity logout
- [ ] Update user training materials
- [ ] Create PIN reset procedure
- [ ] Set up monitoring for failed login attempts
- [ ] Configure backup authentication method
- [ ] Test rollback procedure

---

## Security Checklist

Before going live:

- [ ] Implement server-side lockout enforcement
- [ ] Add PIN hashing (bcrypt/argon2)
- [ ] Enable rate limiting on login endpoint
- [ ] Set up audit log monitoring
- [ ] Configure alerts for suspicious activity
- [ ] Implement PIN complexity requirements
- [ ] Set up regular PIN rotation policy
- [ ] Test security with penetration testing
- [ ] Review and update security policies
- [ ] Train staff on security best practices

---

## Performance Optimization

### Reduce Bundle Size

```typescript
// Use dynamic imports for login components
const PINLoginForm = lazy(() => import('./components/PINLoginForm'));
const LoginForm = lazy(() => import('./components/LoginForm'));

// Wrap in Suspense
<Suspense fallback={<LoadingScreen />}>
  {loginMethod === 'pin' ? <PINLoginForm /> : <LoginForm />}
</Suspense>
```

### Optimize Activity Monitoring

```typescript
// Increase throttle interval for better performance
// In useInactivityLogout.ts
const throttledReset = () => {
  if (!throttleTimeout) {
    throttleTimeout = setTimeout(() => {
      resetTimer();
      throttleTimeout = null;
    }, 2000); // Change from 1000 to 2000ms
  }
};
```

---

## Support

For additional help:
- See `PIN_AUTHENTICATION.md` for detailed documentation
- Check `IMPLEMENTATION_SUMMARY.md` for technical details
- Review test files for usage examples
- Contact development team

---

## Next Steps

1. **Immediate**: Test the integration in development
2. **Short-term**: Deploy to staging environment
3. **Medium-term**: Implement server-side lockout
4. **Long-term**: Add biometric authentication

---

## Feedback

Please report any issues or suggestions to the development team.
