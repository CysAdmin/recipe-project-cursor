import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../api/client';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const inputClass =
    'w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500';
  const labelClass = 'block text-sm font-medium text-slate-700 mb-1';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await auth.forgotPassword(email.trim().toLowerCase());
      setSuccess(data.message || t('forgotPassword.successMessage'));
    } catch (err) {
      setError(err.data?.error || err.message || t('login.errorLogin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6 text-center">
          {t('forgotPassword.title')}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-brand-800 text-sm">
              {success}
              <Link to="/login" className="mt-2 block text-brand-600 hover:underline font-medium">
                {t('forgotPassword.backToLogin')}
              </Link>
            </div>
          )}
          {!success && (
            <>
              <div>
                <label htmlFor="email" className={labelClass}>
                  {t('forgotPassword.emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder={t('login.placeholderEmail')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {loading ? t('common.loading') : t('forgotPassword.submit')}
              </button>
            </>
          )}
        </form>
        {!success && (
          <p className="mt-4 text-center text-slate-600 text-sm">
            <Link to="/login" className="text-brand-600 hover:underline font-medium">
              {t('forgotPassword.backToLogin')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
