import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const MOUSEMOVE_THROTTLE_MS = 10 * 1000; // reset at most every 10s on mousemove

export default function IdleTracker() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const timeoutRef = useRef(null);
  const lastResetRef = useRef(Date.now());

  const scheduleLogout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      logout();
      navigate('/login', { state: { message: t('login.idleLogoutMessage') }, replace: true });
    }, IDLE_TIMEOUT_MS);
  }, [logout, navigate, t]);

  const resetTimer = useCallback(() => {
    lastResetRef.current = Date.now();
    scheduleLogout();
  }, [scheduleLogout]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleMouseMove = useCallback(() => {
    const now = Date.now();
    if (now - lastResetRef.current >= MOUSEMOVE_THROTTLE_MS) resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    scheduleLogout();

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, handleActivity));
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [scheduleLogout, handleActivity, handleMouseMove]);

  return null;
}
