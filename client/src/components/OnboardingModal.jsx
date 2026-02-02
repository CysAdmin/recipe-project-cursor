import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const TOTAL_STEPS = 4;

const STEP_EMOJIS = ['👋', '🔍', '🏷️', '🚀'];

export default function OnboardingModal({ isOpen, onComplete, onSkip, isReplay = false }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  const handlePrimaryCta = useCallback(() => {
    if (currentStep === TOTAL_STEPS) {
      onComplete();
    } else {
      handleNext();
    }
  }, [currentStep, onComplete, handleNext]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') handleSkip();
      if (e.key === 'Enter') handlePrimaryCta();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleSkip, handlePrimaryCta]);

  useEffect(() => {
    if (isOpen) setCurrentStep(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const stepTitles = [
    t('onboarding.step1Title'),
    t('onboarding.step2Title'),
    t('onboarding.step3Title'),
    t('onboarding.step4Title'),
  ];
  const stepMessages = [
    t('onboarding.step1Message'),
    t('onboarding.step2Message'),
    t('onboarding.step3Message'),
    t('onboarding.step4Message'),
  ];

  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-message"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleSkip}
        onKeyDown={(e) => e.key === 'Enter' && handleSkip()}
        role="button"
        tabIndex={0}
        aria-label={t('onboarding.skip')}
      />
      <div
        className="relative bg-white rounded-xl shadow-xl max-w-[600px] w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-lg px-2 py-1"
        >
          {t('onboarding.skip')}
        </button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-4" aria-hidden>
            {STEP_EMOJIS[currentStep - 1]}
          </div>
          <h2 id="onboarding-title" className="font-display text-2xl font-bold text-slate-900 mb-3">
            {stepTitles[currentStep - 1]}
          </h2>
          <p id="onboarding-message" className="text-slate-600 leading-relaxed">
            {stepMessages[currentStep - 1]}
          </p>
        </div>

        <div className="flex justify-center gap-1.5 mb-6" aria-hidden>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 === currentStep ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {isLastStep && (
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm text-slate-600">{t('onboarding.step4DontShowAgain')}</span>
          </label>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="order-2 sm:order-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {t('onboarding.back')}
            </button>
          )}
          <div className="flex-1 flex gap-3 sm:gap-4 sm:order-2">
            {isLastStep && (
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {t('onboarding.step4CtaSecondary')}
              </button>
            )}
            <button
              type="button"
              onClick={handlePrimaryCta}
              className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            >
              {isLastStep
              ? t('onboarding.step4CtaPrimary')
              : currentStep === 1
                ? t('onboarding.step1Cta')
                : t(`onboarding.step${currentStep}Cta`)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
