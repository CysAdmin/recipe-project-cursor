import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../api/client';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(t('register.errorPasswordLength'));
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setError(t('register.errorPasswordChars'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordsMismatch'));
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, newPassword);
      navigate('/login', { state: { message: t('resetPassword.successMessage') } });
    } catch (err) {
      setError(err.data?.error || err.message || t('resetPassword.errorInvalidOrExpired'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">
            {t('resetPassword.title')}
          </h1>
          <p className="text-red-600 mb-6">{t('resetPassword.errorInvalidOrExpired')}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6 text-center">
          {t('resetPassword.title')}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="newPassword" className={labelClass}>
              {t('resetPassword.newPasswordLabel')}
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelClass}>
              {t('resetPassword.confirmPasswordLabel')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('common.loading') : t('resetPassword.submit')}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-600 text-sm">
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            {t('resetPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
