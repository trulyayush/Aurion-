export type LoadingStageKey = 'initializing' | 'preparing' | 'workspace' | 'ready';

export interface LoadingReadinessSignals {
  fontsReady: boolean;
  scene3dReady: boolean;
  workspaceReady: boolean;
  minDurationElapsed: boolean;
}

export const LOADING_STAGE_MESSAGES: Record<LoadingStageKey, string> = {
  initializing: 'Initializing AURION',
  preparing: 'Preparing your experience',
  workspace: 'Loading your financial workspace',
  ready: 'Almost ready',
};

/**
 * Derives the active initialization stage purely from genuine readiness signals.
 * Never invents fake progress percentages.
 */
export function resolveLoadingStage(signals: LoadingReadinessSignals): LoadingStageKey {
  if (!signals.fontsReady) {
    return 'initializing';
  }
  if (!signals.scene3dReady) {
    return 'preparing';
  }
  if (!signals.workspaceReady) {
    return 'workspace';
  }
  return 'ready';
}

/**
 * Determines when the loading screen may begin its graceful exit transition.
 * Requires both real initialization readiness and the brief minimum brand reveal window.
 */
export function canDismissLoadingScreen(signals: LoadingReadinessSignals): boolean {
  return (
    signals.fontsReady &&
    signals.scene3dReady &&
    signals.workspaceReady &&
    signals.minDurationElapsed
  );
}

/**
 * Computes minimum display and hard-safety timeout durations respecting reduced-motion preferences.
 */
export function getLoadingTimingConfig(reducedMotion: boolean): {
  minDisplayMs: number;
  assetFallbackMs: number;
  exitDurationMs: number;
} {
  if (reducedMotion) {
    return {
      minDisplayMs: 700,
      assetFallbackMs: 1800,
      exitDurationMs: 280,
    };
  }
  return {
    minDisplayMs: 1950,
    assetFallbackMs: 3600,
    exitDurationMs: 680,
  };
}
