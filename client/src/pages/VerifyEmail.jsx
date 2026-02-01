import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../api/client';

export default function VerifyEmail() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const hasCalledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage(t('verifyEmail.missingToken'));
      return;
    }
    if (hasCalledRef.current) return;
    hasCalledRef.current = true;

    auth
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus((prev) => (prev === 'success' ? prev : 'error'));
        setErrorMessage(err.data?.error || err.message || t('verifyEmail.error'));
      });
  }, [token, t]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900 mb-6">{t('verifyEmail.title')}</h1>
        {status === 'loading' && <p className="text-slate-600">{t('common.loading')}</p>}
        {status === 'success' && (
          <>
            <p className="text-slate-700 mb-6">{t('verifyEmail.success')}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
            >
              {t('verifyEmail.goToLogin')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-600 mb-6">{errorMessage}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {t('verifyEmail.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
