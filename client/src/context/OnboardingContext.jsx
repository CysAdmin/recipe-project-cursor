import React, { createContext, useContext, useState, useCallback } from 'react';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [isTutorialForced, setIsTutorialForced] = useState(false);

  const openTutorial = useCallback(() => {
    setIsTutorialForced(true);
  }, []);

  const closeTutorial = useCallback(() => {
    setIsTutorialForced(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{ isTutorialForced, openTutorial, closeTutorial }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
