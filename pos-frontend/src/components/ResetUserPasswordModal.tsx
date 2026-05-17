'use client';

import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { validatePasswordComplexity } from '../utils/passwordValidation';
import './ChangePasswordModal.css';

interface ResetUserPasswordModalProps {
  isOpen: boolean;
  targetUserId: string;
  targetEmail: string;
  onClose: () => void;
}

const ResetUserPasswordModal: React.FC<ResetUserPasswordModalProps> = ({
  isOpen,
  targetUserId,
  targetEmail,
  onClose,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetFields = () => {
    setNewPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    resetFields();
    onClose();
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      if (!targetUserId) {
        setError('No target user selected.');
        return;
      }

      if (!newPassword || !confirmPassword) {
        setError('Please complete all fields.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }

      const complexityErrors = validatePasswordComplexity(newPassword);
      if (complexityErrors.length > 0) {
        setError(complexityErrors.join(' '));
        return;
      }

      const { data, error } = await supabase.functions.invoke('manager-reset-password', {
        body: {
          targetUserId,
          newPassword,
        },
      });

      if (error) throw error;

      if (data?.error) {
        setError(data.error);
        return;
      }

      setMessage(`Password reset successfully for ${targetEmail}.`);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-modal-overlay" onClick={handleClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="password-modal-title">Reset User Password</h2>
        <p className="password-modal-subtitle">
          Reset password for <strong>{targetEmail}</strong>
        </p>

        <div className="password-form">
          <div className="password-field">
            <label htmlFor="resetNewPassword">New Password</label>
            <input
              id="resetNewPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="password-field">
            <label htmlFor="resetConfirmPassword">Confirm New Password</label>
            <input
              id="resetConfirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div className="password-rules">
          <p>Password must have:</p>
          <ul>
            <li>At least 8 characters</li>
            <li>At least 1 uppercase letter</li>
            <li>At least 1 number</li>
          </ul>
        </div>

        {message && <div className="password-alert success">{message}</div>}
        {error && <div className="password-alert error">{error}</div>}

        <div className="password-actions">
          <button
            type="button"
            className="password-btn cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="password-btn save"
            onClick={handleResetPassword}
            disabled={loading}
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetUserPasswordModal;