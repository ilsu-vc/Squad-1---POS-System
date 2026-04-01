'use client';

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, HeartPulse, AlertCircle, LogIn, Loader2 } from 'lucide-react';
import './LoginForm.css';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <HeartPulse size={30} strokeWidth={2.5} />
          </div>
          <h1 className="login-title">PharmaCare POS</h1>
          <p className="login-subtitle">Secure access for staff and administrators</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-form-group">
            <label htmlFor="email" className="login-label">Email Address</label>
            <div className="login-input-wrapper">
              <input
                id="email"
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <Mail className="login-input-icon" size={20} />
            </div>
          </div>

          <div className="login-form-group" style={{ marginBottom: '28px' }}>
            <label htmlFor="password" className="login-label">Password</label>
            <div className="login-input-wrapper">
              <input
                id="password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <Lock className="login-input-icon" size={20} />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-button" disabled={loading}>
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
        </form>

        <div className="login-footer">
          &copy; {new Date().getFullYear()} Squad-1 POS System
        </div>
      </div>
    </div>
  );
};

export default LoginForm;