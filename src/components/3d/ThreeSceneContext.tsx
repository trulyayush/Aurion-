import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LionState } from '../../types/finance';
import { detectSoftwareWebGL, isWebGLAvailable, prefersReducedMotion } from '../../utils/threeStudio';

interface ThreeSceneContextValue {
  webglAvailable: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  globalLionState: LionState;
  setGlobalLionState: (state: LionState) => void;
  lastInteractedAt: number;
  notifyInteraction: () => void;
}

const ThreeSceneContext = createContext<ThreeSceneContextValue | null>(null);

export const ThreeSceneProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalLionState, setGlobalLionState] = useState<LionState>('idle');
  const [lastInteractedAt, setLastInteractedAt] = useState(0);

  const webglAvailable = useMemo(() => isWebGLAvailable(), []);
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const notifyInteraction = useCallback(() => setLastInteractedAt(Date.now()), []);

  const value = useMemo<ThreeSceneContextValue>(
    () => ({
      webglAvailable,
      isSoftwareGl,
      reducedMotion,
      globalLionState,
      setGlobalLionState,
      lastInteractedAt,
      notifyInteraction,
    }),
    [webglAvailable, isSoftwareGl, reducedMotion, globalLionState, lastInteractedAt, notifyInteraction]
  );

  return <ThreeSceneContext.Provider value={value}>{children}</ThreeSceneContext.Provider>;
};

export function useThreeScene(): ThreeSceneContextValue {
  const ctx = useContext(ThreeSceneContext);
  if (ctx) return ctx;
  return {
    webglAvailable: isWebGLAvailable(),
    isSoftwareGl: detectSoftwareWebGL(),
    reducedMotion: prefersReducedMotion(),
    globalLionState: 'idle',
    setGlobalLionState: () => {},
    lastInteractedAt: 0,
    notifyInteraction: () => {},
  };
}
