import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../api/client';

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!displayName?.trim()) {
      setError(t('register.errorDisplayNameRequired'));
      return;
    }
    if (password.length < 8) {
      setError(t('register.errorPasswordLength'));
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(t('register.errorPasswordChars'));
      return;
    }
    setLoading(true);
    try {
      await auth.register({
        email,
        password,
        display_name: displayName.trim(),
      });
      navigate('/login', { state: { message: t('register.checkEmail') } });
    } catch (err) {
      setError(err.data?.error || err.message || t('register.errorRegister'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6 text-center">{t('register.title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelClass}>
              {t('register.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder={t('register.placeholderEmail')}
            />
          </div>
          <div>
            <label htmlFor="displayName" className={labelClass}>
              {t('register.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className={inputClass}
              placeholder={t('register.placeholderName')}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              {t('register.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-600 text-sm">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            {t('register.logInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
