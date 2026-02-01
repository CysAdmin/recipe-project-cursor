import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { auth as authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STORAGE_KEY, supportedLngs } from '../i18n';

const LANGUAGE_LABELS = { de: 'Deutsch', en: 'English' };

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');

  useEffect(() => {
    setDisplayName(user?.display_name ?? '');
  }, [user?.display_name]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const profileMutation = useMutation({
    mutationFn: (body) => authApi.updateProfile(body),
    onSuccess: (data) => {
      refreshUser();
      if (data?.user) setDisplayName(data.user.display_name ?? '');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    profileMutation.mutate({ display_name: displayName.trim() || null });
  };

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
          <h2 className="text-lg font-semibold text-slate-800 mb-3">{t('profile.displayName')}</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
            <p className="text-slate-500 text-sm">{t('profile.emailLogin')} {user?.email}</p>
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {profileMutation.isPending ? t('common.saving') : t('common.save')}
            </button>
            {profileMutation.isSuccess && (
              <p className="text-green-500 text-sm">{t('profile.saveSuccess')}</p>
            )}
            {profileMutation.isError && (
              <p className="text-red-400 text-sm">{profileMutation.error?.message ?? t('profile.saveError')}</p>
            )}
          </form>
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
      </div>
    </div>
  );
}
