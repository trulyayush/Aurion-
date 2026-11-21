import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canDismissLoadingScreen,
  getLoadingTimingConfig,
  LOADING_STAGE_MESSAGES,
  resolveLoadingStage,
} from './loadingSequence';

test('resolveLoadingStage tracks genuine readiness signals sequentially without fake percentages', () => {
  assert.equal(
    resolveLoadingStage({
      fontsReady: false,
      scene3dReady: false,
      workspaceReady: false,
      minDurationElapsed: false,
    }),
    'initializing'
  );

  assert.equal(
    resolveLoadingStage({
      fontsReady: true,
      scene3dReady: false,
      workspaceReady: false,
      minDurationElapsed: false,
    }),
    'preparing'
  );

  assert.equal(
    resolveLoadingStage({
      fontsReady: true,
      scene3dReady: true,
      workspaceReady: false,
      minDurationElapsed: true,
    }),
    'workspace'
  );

  assert.equal(
    resolveLoadingStage({
      fontsReady: true,
      scene3dReady: true,
      workspaceReady: true,
      minDurationElapsed: false,
    }),
    'ready'
  );

  assert.equal(LOADING_STAGE_MESSAGES.initializing, 'Initializing AURION');
  assert.equal(LOADING_STAGE_MESSAGES.preparing, 'Preparing your experience');
  assert.equal(LOADING_STAGE_MESSAGES.workspace, 'Loading your financial workspace');
  assert.equal(LOADING_STAGE_MESSAGES.ready, 'Almost ready');
});

test('canDismissLoadingScreen requires all readiness signals plus minimum display window', () => {
  assert.equal(
    canDismissLoadingScreen({
      fontsReady: true,
      scene3dReady: true,
      workspaceReady: true,
      minDurationElapsed: false,
    }),
    false
  );

  assert.equal(
    canDismissLoadingScreen({
      fontsReady: true,
      scene3dReady: false,
      workspaceReady: true,
      minDurationElapsed: true,
    }),
    false
  );

  assert.equal(
    canDismissLoadingScreen({
      fontsReady: true,
      scene3dReady: true,
      workspaceReady: true,
      minDurationElapsed: true,
    }),
    true
  );
});

test('getLoadingTimingConfig shortens animations cleanly under reduced-motion preference', () => {
  const normal = getLoadingTimingConfig(false);
  const reduced = getLoadingTimingConfig(true);
  assert.ok(reduced.minDisplayMs < normal.minDisplayMs);
  assert.ok(reduced.exitDurationMs < normal.exitDurationMs);
  assert.ok(normal.assetFallbackMs > normal.minDisplayMs);
});
