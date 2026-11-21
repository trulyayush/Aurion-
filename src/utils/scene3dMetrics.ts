import { CategoryBreakdownItem, FinancialGoal, LionState } from '../types/finance';

export type CameraPreset = 'lion' | 'lion-compact' | 'financial' | 'goal';

export interface CameraPresetConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  parallaxStrength: [number, number];
}

export function getCameraPresetConfig(
  preset: CameraPreset,
  lionState: LionState = 'idle'
): CameraPresetConfig {
  if (preset === 'financial') {
    return {
      position: [0, 2.35, 4.95],
      target: [0, 0.52, 0],
      fov: 36,
      parallaxStrength: [0.42, 0.18],
    };
  }
  if (preset === 'goal') {
    return {
      position: [0, 1.42, 3.35],
      target: [0, 0.44, 0],
      fov: 34,
      parallaxStrength: [0.3, 0.14],
    };
  }

  const baseZ = preset === 'lion-compact' ? 4.82 : 4.68;
  const baseY = preset === 'lion-compact' ? 1.32 : 1.38;
  const zOffset =
    lionState === 'listening' || lionState === 'speaking'
      ? -0.24
      : lionState === 'welcoming' || lionState === 'happy'
      ? 0.12
      : 0;

  return {
    position: [0, baseY, Number((baseZ + zOffset).toFixed(2))],
    target: [0, 0.9, 0],
    fov: 34,
    parallaxStrength: [0.22, 0.12],
  };
}

export interface CategoryBarMetric {
  category: string;
  amount: number;
  percentage: number;
  count: number;
  normalizedHeight: number;
  angle: number;
  colorIndex: number;
}

export interface HealthRingMetric {
  scoreRatio: number;
  arcAngle: number;
  sphereScale: number;
  coinCount: number;
}

export type GoalModelKind = 'house' | 'vehicle' | 'travel' | 'vault';

export interface GoalRingMetric {
  modelKind: GoalModelKind;
  progressRatio: number;
  arcAngle: number;
  isAchieved: boolean;
}

export function computeCategoryBarMetrics(
  categories: CategoryBreakdownItem[],
  maxBars = 6
): CategoryBarMetric[] {
  const slice = categories.slice(0, Math.max(1, maxBars));
  if (slice.length === 0) return [];
  const maxAmount = Math.max(...slice.map((c) => Math.max(0, c.amount)), 1);
  const count = slice.length;
  const spread = Math.PI * 0.88;

  return slice.map((item, idx) => {
    const ratio = Math.max(0, item.amount) / maxAmount;
    const normalizedHeight = Number((0.24 + ratio * 0.76).toFixed(3));
    const t = count === 1 ? 0.5 : idx / (count - 1);
    const angle = (t - 0.5) * spread;
    return {
      category: item.category,
      amount: item.amount,
      percentage: item.percentage,
      count: item.count,
      normalizedHeight,
      angle,
      colorIndex: idx,
    };
  });
}

export function computeHealthRingMetrics(
  healthScoreTotal: number,
  savingsRate: number | null,
  netCashFlow: number
): HealthRingMetric {
  const clampedScore = Math.max(0, Math.min(100, Number.isFinite(healthScoreTotal) ? healthScoreTotal : 0));
  const scoreRatio = Number((clampedScore / 100).toFixed(3));
  const arcAngle = Math.max(0.15, scoreRatio * Math.PI * 2);

  const effectiveRate = savingsRate !== null ? Math.max(-20, Math.min(60, savingsRate)) : 10;
  const sphereScale = Number((0.78 + Math.max(0, effectiveRate) / 140).toFixed(3));

  let coinCount = 2;
  if (netCashFlow > 0) {
    coinCount = Math.min(9, Math.max(3, Math.round(2 + Math.max(0, effectiveRate) / 6)));
  } else if (netCashFlow < 0) {
    coinCount = 1;
  }

  return {
    scoreRatio,
    arcAngle,
    sphereScale,
    coinCount,
  };
}

export function mapGoalCategoryToModelType(category: FinancialGoal['category']): GoalModelKind {
  switch (category) {
    case 'Home':
      return 'house';
    case 'Vehicle':
      return 'vehicle';
    case 'Travel':
      return 'travel';
    case 'Emergency Fund':
    case 'Retirement':
    case 'Education':
    case 'Other':
    default:
      return 'vault';
  }
}

export function computeGoalRingMetrics(goal: FinancialGoal): GoalRingMetric {
  const target = Math.max(1, goal.targetAmount || 1);
  const ratio = Math.max(0, Math.min(1, (goal.currentSavings || 0) / target));
  return {
    modelKind: mapGoalCategoryToModelType(goal.category),
    progressRatio: Number(ratio.toFixed(3)),
    arcAngle: Math.max(0.12, ratio * Math.PI * 2),
    isAchieved: (goal.currentSavings || 0) >= target,
  };
}

export function clampAudioLevel(level: number, reducedMotion: boolean): number {
  if (!Number.isFinite(level) || level <= 0) return 0;
  const clamped = Math.min(1, Math.max(0, level));
  return reducedMotion ? Number((clamped * 0.35).toFixed(3)) : Number(clamped.toFixed(3));
}
