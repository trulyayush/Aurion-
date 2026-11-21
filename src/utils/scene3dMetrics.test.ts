import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampAudioLevel,
  computeCategoryBarMetrics,
  computeGoalRingMetrics,
  computeHealthRingMetrics,
  getCameraPresetConfig,
  mapGoalCategoryToModelType,
} from './scene3dMetrics';
import { CategoryBreakdownItem, FinancialGoal } from '../types/finance';

test('computeCategoryBarMetrics normalizes heights and spreads angles cleanly', () => {
  const items: CategoryBreakdownItem[] = [
    { category: 'Rent and housing', amount: 24000, percentage: 50, count: 1 },
    { category: 'Food and groceries', amount: 12000, percentage: 25, count: 8 },
    { category: 'Transportation', amount: 6000, percentage: 12.5, count: 5 },
  ];
  const bars = computeCategoryBarMetrics(items, 5);
  assert.equal(bars.length, 3);
  assert.equal(bars[0].normalizedHeight, 1);
  assert.ok(bars[1].normalizedHeight > bars[2].normalizedHeight);
  assert.ok(bars[0].angle < 0 && bars[2].angle > 0);
  assert.equal(bars[1].angle, 0);
});

test('computeHealthRingMetrics clamps scores and scales coins by savings rate', () => {
  const strong = computeHealthRingMetrics(88, 32, 25000);
  assert.equal(strong.scoreRatio, 0.88);
  assert.ok(strong.arcAngle > Math.PI * 1.5);
  assert.ok(strong.coinCount >= 6);

  const deficit = computeHealthRingMetrics(40, -10, -5000);
  assert.equal(deficit.coinCount, 1);
  assert.equal(deficit.scoreRatio, 0.4);
});

test('mapGoalCategoryToModelType maps categories to expected 3D sculptures', () => {
  assert.equal(mapGoalCategoryToModelType('Home'), 'house');
  assert.equal(mapGoalCategoryToModelType('Vehicle'), 'vehicle');
  assert.equal(mapGoalCategoryToModelType('Travel'), 'travel');
  assert.equal(mapGoalCategoryToModelType('Emergency Fund'), 'vault');
  assert.equal(mapGoalCategoryToModelType('Retirement'), 'vault');
});

test('computeGoalRingMetrics detects goal achievement and progress arc', () => {
  const goal: FinancialGoal = {
    id: 'g1',
    title: 'House Down Payment',
    category: 'Home',
    targetAmount: 500000,
    currentSavings: 500000,
    monthlyContribution: 20000,
    targetDate: '2027-01-01',
  };
  const achieved = computeGoalRingMetrics(goal);
  assert.equal(achieved.modelKind, 'house');
  assert.equal(achieved.isAchieved, true);
  assert.equal(achieved.progressRatio, 1);
});

test('clampAudioLevel respects bounds and reduced-motion attenuation', () => {
  assert.equal(clampAudioLevel(1.8, false), 1);
  assert.equal(clampAudioLevel(-0.2, false), 0);
  assert.equal(clampAudioLevel(0.8, true), 0.28);
});

test('getCameraPresetConfig frames lion states and financial scenes cleanly', () => {
  const lionIdle = getCameraPresetConfig('lion', 'idle');
  const lionListen = getCameraPresetConfig('lion', 'listening');
  const lionCompact = getCameraPresetConfig('lion-compact', 'idle');
  assert.ok(lionListen.position[2] < lionIdle.position[2]);
  assert.ok(lionCompact.position[2] > lionIdle.position[2]);

  const financial = getCameraPresetConfig('financial');
  assert.deepEqual(financial.target, [0, 0.52, 0]);
  const goal = getCameraPresetConfig('goal');
  assert.deepEqual(goal.target, [0, 0.44, 0]);
});
