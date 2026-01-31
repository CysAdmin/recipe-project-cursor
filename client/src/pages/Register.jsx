import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/client';

export default function Register() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      const { token, user: userData } = await auth.register({
        email,
        password,
        display_name: displayName || undefined,
      });
      login(token, userData);
      navigate('/app');
    } catch (err) {
      setError(err.data?.error || err.message || t('register.errorRegister'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-white mb-6 text-center">{t('register.title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">
              {t('register.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={t('register.placeholderEmail')}
            />
          </div>
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-400 mb-1">
              {t('register.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder={t('register.placeholderName')}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">
              {t('register.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? t('register.submitting') : t('register.submit')}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-500 text-sm">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-brand-400 hover:underline">
            {t('register.logInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
