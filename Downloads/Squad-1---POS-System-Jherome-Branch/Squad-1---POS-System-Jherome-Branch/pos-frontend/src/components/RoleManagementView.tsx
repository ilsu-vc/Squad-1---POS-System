'use client';

import React, { useEffect, useState } from 'react';
import { roleApi } from '../services/roleApi';
import { reportingApi } from '../services/reportingApi';
import { UserProfile, UserRole } from '../types/auth';
import ResetUserPasswordModal from './ResetUserPasswordModal';
import './RoleManagementView.css';

import usersIcon from '../assets/images/users_icon.png';

interface RoleManagementUser {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  role_id?: number | null;
  is_active: boolean;
}

interface RoleManagementViewProps {
  currentUserId: string;
}

const ROLE_OPTIONS: UserRole[] = ['cashier', 'supervisor', 'manager', 'admin'];

const RoleManagementView: React.FC<RoleManagementViewProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<RoleManagementUser[]>([]);
  const [originalRoles, setOriginalRoles] = useState<Record<string, UserRole>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<RoleManagementUser | null>(null);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadCurrentUserProfile = async () => {
    try {
      const result: any = await roleApi.getUser(currentUserId);
      if (result.error) throw new Error(result.error);
      setCurrentUserProfile(result.user as UserProfile);
    } catch (err) {
      console.error('Failed to load current user profile:', err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const result: any = await roleApi.getUsers();
      if (result.error) throw new Error(result.error);
      const loadedUsers = (result.users || []) as RoleManagementUser[];
      setUsers(loadedUsers);

      const rolesMap: Record<string, UserRole> = {};
      loadedUsers.forEach((user) => {
        rolesMap[user.id] = user.role;
      });
      setOriginalRoles(rolesMap);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCurrentUserProfile();

    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);

    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
    );
    setOpenDropdownId(null);
  };

  const handleSaveRole = async (user: RoleManagementUser) => {
    try {
      setSavingUserId(user.id);
      setMessage('');
      setError('');
      const oldRole = originalRoles[user.id];

      const result: any = await roleApi.updateRole(user.id, user.role);
      if (result.error) throw new Error(result.error);

      if (currentUserProfile && oldRole && oldRole !== user.role) {
        await reportingApi.logActivity({
          userId: currentUserProfile.id,
          userEmail: currentUserProfile.email,
          actionType: 'role_changed',
          actionDetails: `Changed role of ${user.email} from ${oldRole} to ${user.role}`,
          entityType: 'user_profile',
          entityId: String(user.id),
        });
      }

      setOriginalRoles((prev) => ({ ...prev, [user.id]: user.role }));
      setMessage(`Role updated successfully for ${user.email}.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update user role.');
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="role-management-view role-rise-up">
      <div className="role-shell">
        <div className="role-topbar">
          <div>
            <p className="role-eyebrow">ACCESS CONTROL</p>
            <h2 className="role-header-title">Role Management</h2>
          </div>

          <div className="role-users-badge role-surface interactive-surface">
            <div className="role-users-icon-wrap">
              <img src={usersIcon.src} alt="Users" className="role-users-icon" />
            </div>
            <div className="role-users-text-group">
              <span className="role-users-number">{filteredUsers.length}</span>
              <span className="role-users-label">Users</span>
            </div>
          </div>
        </div>

        <div className="role-toolbar role-surface">
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="role-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {message && (
          <div className="role-management-alert success">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            {message}
          </div>
        )}

        {error && (
          <div className="role-management-alert error">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        {loading ? (
          <div className="inline-loading-container role-surface">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Loading users...</div>
          </div>
        ) : (
          <div className="role-list-panel role-surface">
            <div className="role-scroll-container">
              <div className="role-management-list">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => {
                    const isCurrentUser = user.id === currentUserId;
                    const isDropdownOpen = openDropdownId === user.id;
                    const hasChanged = originalRoles[user.id] !== user.role;

                    return (
                      <div
                        key={user.id}
                        className="role-user-card interactive-surface"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <div className="role-user-main">
                          <div className="role-user-avatar">
                            {(user.full_name || user.email || 'U')[0].toUpperCase()}
                          </div>

                          <div className="role-user-info">
                            <div className="role-user-name-row">
                              <div className="role-user-name">
                                {user.full_name || 'Unnamed User'}
                                {isCurrentUser ? ' (You)' : ''}
                              </div>
                              <div
                                className={`role-user-status ${
                                  user.is_active ? 'active' : 'inactive'
                                }`}
                              >
                                {user.is_active ? 'Active' : 'Inactive'}
                              </div>
                            </div>

                            <div className="role-user-email">{user.email}</div>
                          </div>
                        </div>

                        <div className="role-user-actions">
                          <div
                            className="custom-dropdown-container"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className={`custom-dropdown-trigger ${
                                isDropdownOpen ? 'active' : ''
                              }`}
                              onClick={() =>
                                setOpenDropdownId(isDropdownOpen ? null : user.id)
                              }
                              type="button"
                            >
                              <span>
                                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              </span>
                              <svg
                                className="dropdown-chevron"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>

                            {isDropdownOpen && (
                              <div className="custom-dropdown-menu">
                                {ROLE_OPTIONS.map((role) => (
                                  <div
                                    key={role}
                                    className={`dropdown-item ${
                                      user.role === role ? 'selected' : ''
                                    }`}
                                    onClick={() => handleRoleChange(user.id, role)}
                                  >
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => handleSaveRole(user)}
                            disabled={savingUserId === user.id}
                            className={`role-save-btn ${hasChanged ? 'changed' : ''}`}
                            type="button"
                          >
                            {savingUserId === user.id ? 'Saving...' : 'Save'}
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUserForReset(user);
                              setIsResetPasswordModalOpen(true);
                            }}
                            className="role-secondary-btn"
                            type="button"
                          >
                            Reset Password
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="role-empty-state">
                    No users found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <ResetUserPasswordModal
        isOpen={isResetPasswordModalOpen}
        targetUserId={selectedUserForReset?.id || ''}
        targetEmail={selectedUserForReset?.email || ''}
        onClose={() => {
          setIsResetPasswordModalOpen(false);
          setSelectedUserForReset(null);
        }}
      />
    </div>
  );
};

export default RoleManagementView;