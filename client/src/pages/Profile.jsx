import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { auth as authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useOnboarding } from '../context/OnboardingContext';
import { STORAGE_KEY, supportedLngs } from '../i18n';

const LANGUAGE_LABELS = { de: 'Deutsch', en: 'English' };

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { openTutorial } = useOnboarding();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      logout();
      navigate('/', { replace: true });
    },
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) return;
    passwordMutation.mutate();
  };

  const passwordError =
    newPassword && newPasswordConfirm && newPassword !== newPasswordConfirm
      ? t('profile.passwordsMismatch')
      : null;

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem(STORAGE_KEY, lng);
    } catch (_) {}
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold text-slate-800">{t('profile.title')}</h1>
      <p className="text-slate-600 mb-2">{t('profile.subline')}</p>

      <div className="max-w-md space-y-10">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('profile.language')}</h2>
          <p className="text-slate-500 text-sm mb-3">{t('profile.languageDesc')}</p>
          <select
            value={i18n.language || 'de'}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            {supportedLngs.map((lng) => (
              <option key={lng} value={lng}>
                {LANGUAGE_LABELS[lng] ?? lng}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('profile.showTutorial')}</h2>
          <p className="text-slate-500 text-sm mb-3">{t('profile.showTutorialDesc')}</p>
          <button
            type="button"
            onClick={openTutorial}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {t('profile.showTutorial')}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('profile.changePassword')}</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('profile.currentPassword')}
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('profile.newPassword')}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder={t('profile.newPasswordConfirm')}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="text-slate-500 text-sm">{t('profile.passwordHint')}</p>
            {(passwordError || passwordMutation.isError) && (
              <p className="text-red-600 text-sm">
                {passwordError || passwordMutation.error?.message}
              </p>
            )}
            {passwordMutation.isSuccess && (
              <p className="text-green-600 text-sm">{t('profile.passwordSuccess')}</p>
            )}
            <button
              type="submit"
              disabled={
                passwordMutation.isPending ||
                !currentPassword ||
                !newPassword ||
                !newPasswordConfirm ||
                newPassword !== newPasswordConfirm
              }
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {passwordMutation.isPending ? t('profile.changing') : t('profile.changeButton')}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-red-200 bg-white shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('profile.deleteAccount')}</h2>
          <p className="text-slate-500 text-sm mb-3">{t('profile.deleteAccountDesc')}</p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmModal(true)}
            className="px-4 py-2 rounded-lg border border-red-500 text-red-600 font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t('profile.deleteAccount')}
          </button>
        </section>
      </div>

      {showDeleteConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 id="delete-account-modal-title" className="text-lg font-semibold text-slate-800 mb-2">
              {t('profile.deleteAccount')}
            </h2>
            <p className="text-slate-600 text-sm mb-6">{t('profile.confirmDeleteAccount')}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deleteAccountMutation.isPending}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => deleteAccountMutation.mutate()}
                disabled={deleteAccountMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteAccountMutation.isPending ? t('profile.deleting') : t('common.confirm')}
              </button>
            </div>
            {deleteAccountMutation.isError && (
              <p className="mt-3 text-red-600 text-sm">{deleteAccountMutation.error?.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
