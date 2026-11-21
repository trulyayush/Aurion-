import React from 'react';
import { LionState } from '../types/finance';
import { ThreeSceneManager } from './3d/ThreeSceneManager';

interface LionAvatar3DProps {
  state: LionState;
  speechPulse?: number; // 0..1 amplitude while speaking
  micLevel?: number; // 0..1 live Web Audio microphone level while listening
  onInteract?: () => void;
  className?: string;
  compact?: boolean;
}

export const LionAvatar3D: React.FC<LionAvatar3DProps> = ({
  state,
  speechPulse = 0,
  micLevel = 0,
  onInteract,
  className = '',
  compact = false,
}) => {
  const fallbackNode = (
    <div
      data-testid="lion-fallback"
      data-lion-state={state}
      onClick={() => onInteract?.()}
      className="relative w-full h-full flex flex-col items-center justify-center rounded-2xl bg-[#EBF0E9] border border-[#D4DCD2] p-6 text-center cursor-pointer"
    >
      <div className="w-24 h-24 rounded-full bg-[#183B32] text-[#F6F4EF] flex items-center justify-center font-display font-bold text-3xl shadow-md border-4 border-[#C4AD7D]">
        A
      </div>
      <div className="mt-3 font-display font-semibold text-base text-[#202321]">
        AURION Companion
      </div>
      <div className="text-xs text-[#5C635E] mt-1">
        State: {state.charAt(0).toUpperCase() + state.slice(1)} · Click to interact
      </div>
    </div>
  );

  return (
    <div title="Click AURION to interact" className={`relative w-full h-full cursor-pointer ${className}`}>
      <ThreeSceneManager
        cameraPreset={compact ? 'lion-compact' : 'lion'}
        showLion
        lionState={state}
        speechPulse={speechPulse}
        micLevel={micLevel}
        onLionInteract={onInteract}
        testId="lion-canvas"
        ariaLabel="Interactive 3D AURION white lion assistant"
        fogColor="#EBF0E9"
        shadowExtent={2.5}
        fallback={fallbackNode}
      />
    </div>
  );
};
