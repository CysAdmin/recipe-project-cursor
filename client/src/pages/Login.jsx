import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { auth } from '../api/client';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const { login } = useAuth();
  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    setResendSuccess('');
    setLoading(true);
    try {
      const { token, user: userData } = await auth.login({ email, password });
      login(token, userData);
      navigate('/app');
    } catch (err) {
      setErrorCode(err.data?.code || '');
      const msg =
        err.data?.code === 'EMAIL_NOT_VERIFIED'
          ? t('login.errorEmailNotVerified')
          : err.data?.error || err.message || t('login.errorLogin');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResendSuccess('');
    setResendLoading(true);
    try {
      const data = await auth.resendVerificationEmail(email.trim());
      setResendSuccess(data.message || t('login.resendVerificationEmailSent'));
      setError('');
      setErrorCode('');
    } catch (err) {
      setResendSuccess('');
      setError(err.data?.error || err.message || t('login.errorLogin'));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-slate-800 mb-6 text-center">{t('login.title')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-sm">
              {error}
              {errorCode === 'EMAIL_NOT_VERIFIED' && email.trim() && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="mt-2 block w-full py-2 rounded-lg border border-brand-500 text-brand-600 text-sm font-medium hover:bg-brand-50 disabled:opacity-50"
                >
                  {resendLoading ? t('common.loading') : t('login.resendVerificationEmail')}
                </button>
              )}
            </div>
          )}
          {resendSuccess && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-sm">
              {resendSuccess}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="login-input w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              placeholder={t('login.placeholderEmail')}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="login-input w-full px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
        <p className="mt-4 text-center text-slate-500 text-sm">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-brand-400 hover:underline">
            {t('login.signUpLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
