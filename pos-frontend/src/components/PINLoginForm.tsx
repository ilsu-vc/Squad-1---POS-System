'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { HeartPulse, AlertCircle, LogIn, Loader2, Delete, Lock } from 'lucide-react';
import { reportingApi } from '../services/reportingApi';
import './PINLoginForm.css';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface PINLoginFormProps {
  onSuccess?: () => void;
}

const PINLoginForm: React.FC<PINLoginFormProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const [remainingLockoutTime, setRemainingLockoutTime] = useState<string>('');

  // Load lockout state from localStorage on mount
  useEffect(() => {
    const storedLockoutEnd = localStorage.getItem('pin_lockout_end');
    const storedFailedAttempts = localStorage.getItem('pin_failed_attempts');

    if (storedLockoutEnd) {
      const lockoutEnd = parseInt(storedLockoutEnd, 10);
      const now = Date.now();

      if (now < lockoutEnd) {
        setIsLocked(true);
        setLockoutEndTime(lockoutEnd);
      } else {
        // Lockout expired, clear it
        localStorage.removeItem('pin_lockout_end');
        localStorage.removeItem('pin_failed_attempts');
      }
    }

    if (storedFailedAttempts) {
      setFailedAttempts(parseInt(storedFailedAttempts, 10));
    }
  }, []);

  // Update remaining lockout time every second
  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = lockoutEndTime - now;

      if (remaining <= 0) {
        // Lockout expired
        setIsLocked(false);
        setLockoutEndTime(null);
        setFailedAttempts(0);
        localStorage.removeItem('pin_lockout_end');
        localStorage.removeItem('pin_failed_attempts');
        setRemainingLockoutTime('');
      } else {
        // Format remaining time
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setRemainingLockoutTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockoutEndTime]);

  const handleNumberClick = (num: string) => {
    if (isLocked) return;
    if (pin.length < 6) {
      setPin(pin + num);
      setError('');
    }
  };

  const handleBackspace = () => {
    if (isLocked) return;
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (isLocked) return;
    setPin('');
    setError('');
  };

  const handleLogin = async () => {
    if (isLocked) {
      setError(`Account locked. Try again in ${remainingLockoutTime}`);
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In a real implementation, you would have a PIN-based authentication endpoint
      // For now, we'll use email/password with PIN as password
      // This is a placeholder - you should implement proper PIN authentication
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: `cashier${pin}@pos.local`, // Placeholder email format
        password: pin,
      });

      if (authError) {
        // Failed login attempt
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        localStorage.setItem('pin_failed_attempts', newFailedAttempts.toString());

        if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
          // Lock the account
          const lockoutEnd = Date.now() + LOCKOUT_DURATION_MS;
          setIsLocked(true);
          setLockoutEndTime(lockoutEnd);
          localStorage.setItem('pin_lockout_end', lockoutEnd.toString());
          setError(`Too many failed attempts. Account locked for 15 minutes.`);
        } else {
          setError(`Invalid PIN. ${MAX_FAILED_ATTEMPTS - newFailedAttempts} attempts remaining.`);
        }

        setPin('');
        setLoading(false);
        return;
      }

      // Successful login - reset failed attempts
      setFailedAttempts(0);
      localStorage.removeItem('pin_failed_attempts');
      localStorage.removeItem('pin_lockout_end');

      // Log the successful login activity
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          await reportingApi.logActivity({
            userId: sessionData.session.user.id,
            userEmail: sessionData.session.user.email || '',
            actionType: 'LOGIN',
            actionDetails: 'User signed in successfully via PIN login',
            entityType: 'user',
            entityId: sessionData.session.user.id,
          });
        }
      } catch (logErr) {
        console.warn('Failed to log login activity:', logErr);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setError('Login failed. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (isLocked) return;

    if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    } else if (e.key === 'Enter') {
      handleLogin();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className="pin-login-container" onKeyDown={handleKeyPress} tabIndex={0}>
      <div className="pin-login-card">
        <div className="pin-login-header">
          <div className="pin-login-logo">
            <HeartPulse size={40} strokeWidth={2.5} />
          </div>
          <h1 className="pin-login-title">PharmaCare POS</h1>
          <p className="pin-login-subtitle">Enter your PIN to continue</p>
        </div>

        <div className="pin-display-container">
          <div className="pin-display">
            {[...Array(6)].map((_, index) => (
              <div
                key={index}
                className={`pin-dot ${index < pin.length ? 'filled' : ''} ${isLocked ? 'locked' : ''}`}
              >
                {index < pin.length && <Lock size={16} />}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="pin-login-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {isLocked && (
          <div className="pin-lockout-warning">
            <Lock size={20} />
            <div>
              <div className="lockout-title">Account Locked</div>
              <div className="lockout-time">Time remaining: {remainingLockoutTime}</div>
            </div>
          </div>
        )}

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-key"
              onClick={() => handleNumberClick(num.toString())}
              disabled={loading || isLocked}
            >
              {num}
            </button>
          ))}
          <button
            className="pin-key pin-key-action"
            onClick={handleClear}
            disabled={loading || isLocked}
          >
            Clear
          </button>
          <button
            className="pin-key"
            onClick={() => handleNumberClick('0')}
            disabled={loading || isLocked}
          >
            0
          </button>
          <button
            className="pin-key pin-key-action"
            onClick={handleBackspace}
            disabled={loading || isLocked}
          >
            <Delete size={24} />
          </button>
        </div>

        <button
          className="pin-login-button"
          onClick={handleLogin}
          disabled={loading || pin.length < 4 || isLocked}
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn size={20} />
              Sign In
            </>
          )}
        </button>

        <div className="pin-login-footer">
          &copy; {new Date().getFullYear()} Squad-1 POS System
        </div>
      </div>
    </div>
  );
};

export default PINLoginForm;
