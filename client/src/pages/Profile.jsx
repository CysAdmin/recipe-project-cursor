import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { auth as authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
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
      ? 'Passwörter stimmen nicht überein'
      : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-white mb-2">Profil & Einstellungen</h1>
      <p className="text-slate-400 mb-8">Nutzername und Passwort verwalten.</p>

      <div className="max-w-md space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Nutzername</h2>
          <form onSubmit={handleProfileSubmit} className="space-y-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anzeigename (optional)"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-slate-500 text-sm">E-Mail (Login): {user?.email}</p>
            <button
              type="submit"
              disabled={profileMutation.isPending}
              className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {profileMutation.isPending ? 'Speichern…' : 'Speichern'}
            </button>
            {profileMutation.isSuccess && (
              <p className="text-green-500 text-sm">Nutzername wurde gespeichert.</p>
            )}
            {profileMutation.isError && (
              <p className="text-red-400 text-sm">{profileMutation.error?.message ?? 'Fehler beim Speichern.'}</p>
            )}
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Passwort ändern</h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Aktuelles Passwort"
              required
              autoComplete="current-password"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Neues Passwort"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="Neues Passwort bestätigen"
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-slate-500 text-sm">Mind. 8 Zeichen, Buchstaben und Zahlen.</p>
            {(passwordError || passwordMutation.isError) && (
              <p className="text-red-400 text-sm">
                {passwordError || passwordMutation.error?.message}
              </p>
            )}
            {passwordMutation.isSuccess && (
              <p className="text-green-500 text-sm">Passwort wurde geändert.</p>
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
              className="px-4 py-2 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {passwordMutation.isPending ? 'Ändern…' : 'Passwort ändern'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
