import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function IconDotsVertical({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="6" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel, danger }) {
  const { t } = useTranslation();
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <p className="text-slate-600 text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium"
          >
            {t('admin.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {confirmLabel ?? t('admin.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

function ResetPasswordModal({ user, onClose, onSuccess }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => admin.users.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onSuccess?.();
      onClose();
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(t('admin.passwordTooShort'));
      return;
    }
    if (!PASSWORD_REGEX.test(password)) {
      setError(t('admin.passwordRequiresLettersAndNumbers'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('admin.passwordMismatch'));
      return;
    }
    updateMutation.mutate({ id: user.id, body: { new_password: password } });
  };

  if (!user) return null;
  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">{t('admin.resetPasswordAsAdmin')}</h3>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.newPassword')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 text-sm font-medium">
              {t('admin.cancel')}
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
            >
              {updateMutation.isPending ? t('common.loading') : t('admin.setPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const menuContentRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'blocked'
  const [openMenuId, setOpenMenuId] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => admin.users.list(),
  });

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e) => {
      const inButton = menuButtonRef.current?.contains(e.target);
      const inMenu = menuContentRef.current?.contains(e.target);
      if (!inButton && !inMenu) setOpenMenuId(null);
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [openMenuId]);

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    setOpenMenuId(null);
    setConfirmModal(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => admin.users.delete(id),
    onSuccess: () => {
      invalidateAndClose();
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: (id) => admin.users.update(id, { email_verified: true }),
    onSuccess: () => {
      invalidateAndClose();
      setSuccessMessage(t('admin.verificationEmailSent'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: (id) => admin.users.resendVerification(id),
    onSuccess: () => {
      invalidateAndClose();
      setSuccessMessage(t('admin.verificationEmailSent'));
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => admin.users.update(id, body),
    onSuccess: (_, { successMessage: msg }) => {
      invalidateAndClose();
      if (msg) {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    },
  });

  const users = data?.users ?? [];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (u.email && u.email.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !u.is_blocked) ||
      (statusFilter === 'blocked' && u.is_blocked);
    return matchesSearch && matchesStatus;
  });

  const handleConfirm = (payload) => {
    if (payload.type === 'delete') {
      deleteMutation.mutate(payload.id);
    } else if (payload.type === 'admin') {
      updateMutation.mutate({
        id: payload.id,
        body: { is_admin: payload.value },
      });
    } else if (payload.type === 'blocked') {
      updateMutation.mutate({
        id: payload.id,
        body: { blocked: payload.value },
        successMessage: payload.value ? t('admin.accountLocked') : t('admin.accountUnlocked'),
      });
    }
  };

  const apiError =
    (deleteMutation.isError && (deleteMutation.error?.message || deleteMutation.error?.data?.error)) ||
    (verifyEmailMutation.isError && (verifyEmailMutation.error?.message || verifyEmailMutation.error?.data?.error)) ||
    (resendVerificationMutation.isError &&
      (resendVerificationMutation.error?.message || resendVerificationMutation.error?.data?.error)) ||
    (updateMutation.isError && (updateMutation.error?.message || updateMutation.error?.data?.error));

  if (isLoading) return <p className="text-slate-500">{t('admin.loadingUsers')}</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  return (
    <div className="space-y-4" ref={containerRef}>
      {apiError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{apiError}</div>
      )}
      {successMessage && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">{successMessage}</div>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.users')}</h2>
        <Link
          to="/app/admin/users/new"
          className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 w-fit"
        >
          {t('admin.createUser')}
        </Link>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('admin.searchByEmail')}
          className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm"
          aria-label={t('admin.searchByEmail')}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500">{t('admin.filterStatus')}:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            aria-label={t('admin.filterStatus')}
          >
            <option value="all">{t('admin.filterAll')}</option>
            <option value="active">{t('admin.statusActive')}</option>
            <option value="blocked">{t('admin.statusBlocked')}</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t('admin.displayName')}</th>
              <th className="px-4 py-3">{t('admin.email')}</th>
              <th className="px-4 py-3">{t('admin.emailVerified')}</th>
              <th className="px-4 py-3">{t('admin.savedRecipesCount')}</th>
              <th className="px-4 py-3">{t('admin.registrationDate')}</th>
              <th className="px-4 py-3">{t('admin.status')}</th>
              <th className="px-4 py-3">{t('admin.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-700">
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">{u.display_name || t('common.dash')}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">
                  {u.email_verified ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {t('common.yes')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      {t('common.no')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{u.saved_recipes_count ?? 0}</td>
                <td className="px-4 py-2">{u.created_at ? new Date(u.created_at).toLocaleDateString() : t('common.dash')}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      u.is_blocked ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {u.is_blocked ? t('admin.statusBlocked') : t('admin.statusActive')}
                  </span>
                </td>
                <td className="px-4 py-2 relative">
                  <div className="relative">
                    <button
                      type="button"
                      ref={openMenuId === u.id ? menuButtonRef : null}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (openMenuId === u.id) {
                          setOpenMenuId(null);
                        } else {
                          menuButtonRef.current = e.currentTarget;
                          setOpenMenuId(u.id);
                        }
                      }}
                      className="flex items-center justify-center w-8 h-8 rounded text-slate-500 hover:bg-slate-100"
                      aria-label={t('admin.actions')}
                      aria-expanded={openMenuId === u.id}
                    >
                      <IconDotsVertical />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openMenuId &&
        (() => {
          const openUser = users.find((x) => x.id === openMenuId);
          const rect = menuButtonRef.current?.getBoundingClientRect?.();
          if (!openUser || !rect) return null;
          const menuContent = (
            <div
              ref={menuContentRef}
              className="min-w-[7rem] max-w-[11rem] py-1 rounded-lg bg-white border border-slate-200 shadow-lg z-[100]"
              role="menu"
              style={{
                position: 'fixed',
                top: rect.bottom + 4,
                left: (() => {
                  const menuWidth = 112; // 7rem
                  const margin = 16;
                  const vw = typeof document !== 'undefined' ? document.documentElement.clientWidth : 0;
                  const leftAligned = rect.right - menuWidth;
                  const maxLeft = vw - menuWidth - margin;
                  return Math.max(margin, Math.min(leftAligned, maxLeft));
                })(),
              }}
            >
              <Link
                to={`/app/admin/users/${openUser.id}`}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 rounded-t-lg"
                role="menuitem"
                onClick={() => setOpenMenuId(null)}
              >
                {t('admin.viewDetails')}
              </Link>
              {!openUser.email_verified && (
                <button
                  type="button"
                  onClick={() => {
                    resendVerificationMutation.mutate(openUser.id);
                  }}
                  disabled={resendVerificationMutation.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  role="menuitem"
                >
                  {t('admin.resendVerificationEmail')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setResetPasswordUser(openUser);
                  setOpenMenuId(null);
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                {t('admin.resetPasswordAsAdmin')}
              </button>
              {!openUser.email_verified && (
                <button
                  type="button"
                  onClick={() => {
                    verifyEmailMutation.mutate(openUser.id);
                  }}
                  disabled={verifyEmailMutation.isPending}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  role="menuitem"
                >
                  {t('admin.setVerifiedManually')}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setConfirmModal({
                    title: openUser.is_admin ? t('admin.revokeAdminRights') : t('admin.giveAdminRights'),
                    message: openUser.is_admin ? t('admin.confirmRevokeAdminRights') : t('admin.confirmGiveAdmin'),
                    danger: !!openUser.is_admin,
                    onConfirm: () =>
                      handleConfirm({
                        type: 'admin',
                        id: openUser.id,
                        value: !openUser.is_admin,
                      }),
                  });
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                {openUser.is_admin ? t('admin.revokeAdminRights') : t('admin.giveAdminRights')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setConfirmModal({
                    title: openUser.is_blocked ? t('admin.unlockAccount') : t('admin.lockAccount'),
                    message: openUser.is_blocked ? t('admin.confirmUnlockAccount') : t('admin.confirmLockAccount'),
                    danger: !openUser.is_blocked,
                    onConfirm: () =>
                      handleConfirm({
                        type: 'blocked',
                        id: openUser.id,
                        value: !openUser.is_blocked,
                      }),
                  });
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                role="menuitem"
              >
                {openUser.is_blocked ? t('admin.unlockAccount') : t('admin.lockAccount')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenMenuId(null);
                  setConfirmModal({
                    title: t('admin.deleteAccount'),
                    message: t('admin.confirmDeleteUser'),
                    danger: true,
                    onConfirm: () => handleConfirm({ type: 'delete', id: openUser.id }),
                  });
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                role="menuitem"
              >
                {t('admin.deleteAccount')}
              </button>
            </div>
          );
          return createPortal(menuContent, document.body);
        })()}

      {resetPasswordUser && (
        <ResetPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => setSuccessMessage(t('admin.passwordResetSuccess'))}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={() => {
            confirmModal.onConfirm();
            setConfirmModal(null);
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
