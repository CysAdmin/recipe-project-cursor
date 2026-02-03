import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { admin } from '../../api/client';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const inputClass =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function ConfirmModal({ title, message, onConfirm, onCancel, danger }) {
  const { t } = useTranslation();
  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
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
              danger ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand-600 text-white hover:bg-brand-700'
            }`}
          >
            {t('admin.confirm')}
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
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
              className={inputClass}
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
              className={inputClass}
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

export default function AdminUserForm() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = id === 'new';

  const [isEditing, setIsEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', id],
    queryFn: () => admin.users.get(id),
    enabled: !isNew,
  });

  const user = data?.user;

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setDisplayName(user.display_name || '');
      setIsAdmin(!!user.is_admin);
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (body) => (isNew ? admin.users.create(body) : admin.users.update(id, body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      if (isNew) {
        navigate('/app/admin/users');
      } else {
        queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
        setIsEditing(false);
        setPassword('');
      }
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ body }) => admin.users.update(id, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users', id] });
      setConfirmModal(null);
      if (variables?.successMessage) {
        setSuccessMessage(variables.successMessage);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      navigate('/app/admin/users');
    },
    onError: (err) => setError(err.data?.error || err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (isNew) {
      if (!password.trim()) {
        setError(t('admin.passwordRequired'));
        return;
      }
      saveMutation.mutate({
        email: email.trim(),
        password,
        display_name: displayName.trim() || null,
        is_admin: isAdmin,
      });
    } else {
      const body = { email: email.trim(), display_name: displayName.trim() || null, is_admin: isAdmin };
      if (password.trim()) body.new_password = password;
      saveMutation.mutate(body);
    }
  };

  const handleConfirm = (payload) => {
    if (payload.type === 'delete') {
      deleteMutation.mutate();
    } else if (payload.type === 'admin') {
      updateMutation.mutate({ body: { is_admin: payload.value } });
    } else if (payload.type === 'blocked') {
      const msg = payload.value ? t('admin.accountLocked') : t('admin.accountUnlocked');
      updateMutation.mutate({ body: { blocked: payload.value }, successMessage: msg });
    }
  };

  if (!isNew && isLoading) return <p className="text-slate-500">{t('admin.loading')}</p>;
  if (!isNew && !user) return <p className="text-slate-500">{t('admin.loading')}</p>;

  // —— Create user (id === 'new') ——
  if (isNew) {
    return (
      <div className="max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.createUserTitle')}</h2>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{t('login.password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_admin_new"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <label htmlFor="is_admin_new" className="text-sm text-slate-600">
              {t('admin.admin')}
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 disabled:opacity-50"
            >
              {saveMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/app/admin/users')}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // —— Detail view (default) ——
  if (!isEditing) {
    const verifiedDateTime = formatDateTime(user.email_verified_at);
    const registeredDateTime = formatDateTime(user.created_at);
    const lastLoginDateTime = formatDateTime(user.last_login_at);

    return (
      <div className="max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">{t('admin.userDetail')}</h2>
        {(error || deleteMutation.isError) && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error || deleteMutation.error?.message || deleteMutation.error?.data?.error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            {successMessage}
          </div>
        )}

        <dl className="rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 overflow-hidden">
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.email')}</dt>
            <dd className="mt-1 text-sm text-slate-800 sm:mt-0 sm:col-span-2">{user.email}</dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.verified')}</dt>
            <dd className="mt-1 text-sm text-slate-800 sm:mt-0 sm:col-span-2">
              {verifiedDateTime ?? t('common.no')}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.registered')}</dt>
            <dd className="mt-1 text-sm text-slate-800 sm:mt-0 sm:col-span-2">
              {registeredDateTime ?? t('common.dash')}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.lastLogin')}</dt>
            <dd className="mt-1 text-sm text-slate-800 sm:mt-0 sm:col-span-2">
              {lastLoginDateTime ?? t('common.dash')}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.admin')}</dt>
            <dd className="mt-1 text-sm text-slate-800 sm:mt-0 sm:col-span-2">
              {user.is_admin ? t('common.yes') : t('common.no')}
            </dd>
          </div>
          <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-500">{t('admin.status')}</dt>
            <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  user.is_blocked ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {user.is_blocked ? t('admin.statusBlocked') : t('admin.statusActive')}
              </span>
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500"
          >
            {t('common.edit')}
          </button>
          <button
            type="button"
            onClick={() => setResetPasswordUser(user)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {t('admin.resetPassword')}
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmModal({
                title: user.is_admin ? t('admin.revokeAdminRights') : t('admin.giveAdminRights'),
                message: user.is_admin ? t('admin.confirmRevokeAdminRights') : t('admin.confirmGiveAdmin'),
                danger: !!user.is_admin,
                onConfirm: () => handleConfirm({ type: 'admin', value: !user.is_admin }),
              })
            }
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {user.is_admin ? t('admin.revokeAdminRights') : t('admin.giveAdminRights')}
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmModal({
                title: user.is_blocked ? t('admin.unlockAccount') : t('admin.lockAccount'),
                message: user.is_blocked ? t('admin.confirmUnlockAccount') : t('admin.confirmLockAccount'),
                danger: !user.is_blocked,
                onConfirm: () => handleConfirm({ type: 'blocked', value: !user.is_blocked }),
              })
            }
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {user.is_blocked ? t('admin.unlockAccount') : t('admin.lockAccount')}
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmModal({
                title: t('admin.deleteAccount'),
                message: t('admin.confirmDeleteUser'),
                danger: true,
                onConfirm: () => handleConfirm({ type: 'delete' }),
              })
            }
            className="px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
          >
            {t('admin.deleteAccount')}
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => navigate('/app/admin/users')}
            className="text-slate-600 hover:text-slate-800 text-sm font-medium"
          >
            ← {t('admin.users')}
          </button>
        </div>

        {resetPasswordUser && (
          <ResetPasswordModal
            user={resetPasswordUser}
            onClose={() => setResetPasswordUser(null)}
            onSuccess={() => {
              setSuccessMessage(t('admin.passwordResetSuccess'));
              setTimeout(() => setSuccessMessage(null), 3000);
            }}
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

  // —— Edit mode ——
  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">{t('admin.editUser')}</h2>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">{t('admin.displayName')}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            {t('login.password')} {t('admin.passwordOptional')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_admin_edit"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <label htmlFor="is_admin_edit" className="text-sm text-slate-600">
            {t('admin.admin')}
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-500 disabled:opacity-50"
          >
            {saveMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setError('');
              setPassword('');
            }}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
