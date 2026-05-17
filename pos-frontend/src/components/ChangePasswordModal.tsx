'use client';

import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { validatePasswordComplexity } from '../utils/passwordValidation';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  isOpen: boolean;
  userEmail: string;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  userEmail,
  onClose,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resetFields = () => {
    setCurrentPassword('');
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

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      if (!currentPassword || !newPassword || !confirmPassword) {
        setError('Please complete all fields.');
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New password and confirm password do not match.');
        return;
      }

      if (currentPassword === newPassword) {
        setError('New password must be different from your current password.');
        return;
      }

      const complexityErrors = validatePasswordComplexity(newPassword);
      if (complexityErrors.length > 0) {
        setError(complexityErrors.join(' '));
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        setError('No active session found. Please log in again.');
        return;
      }

      const reauthResult = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (reauthResult.error) {
        setError('Current password is incorrect.');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setMessage('Password changed successfully. You will need to log in again.');

      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="password-modal-overlay" onClick={handleClose}>
      <div className="password-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="password-modal-title">Change Password</h2>
        <p className="password-modal-subtitle">
          Update your password for <strong>{userEmail}</strong>
        </p>

        <div className="password-form">
          <div className="password-field">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="password-field">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="password-field">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
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
            onClick={handleChangePassword}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;