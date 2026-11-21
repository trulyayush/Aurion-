import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LionState } from '../../types/finance';
import { clampAudioLevel } from '../../utils/scene3dMetrics';
import { prefersReducedMotion } from '../../utils/threeStudio';
import { buildLionSceneRig } from './lionCharacterBuilder';

export interface LionModelR3FProps {
  state: LionState;
  speechPulse?: number;
  micLevel?: number;
  onInteract?: () => void;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  isSoftwareGl: boolean;
}

const _targetRot = new THREE.Vector2(0, 0);

export const LionModelR3F: React.FC<LionModelR3FProps> = ({
  state,
  speechPulse = 0,
  micLevel = 0,
  onInteract,
  pointerRef,
  isSoftwareGl,
}) => {
  const { gl } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const rig = useMemo(
    () => buildLionSceneRig(maxAnisotropy, isSoftwareGl),
    [maxAnisotropy, isSoftwareGl]
  );

  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const motionScale = reducedMotion ? 0.35 : 1.0;

  const stateRef = useRef<LionState>(state);
  const pulseRef = useRef<number>(speechPulse);
  const micRef = useRef<number>(micLevel);
  const interactRef = useRef(onInteract);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    pulseRef.current = speechPulse;
  }, [speechPulse]);

  useEffect(() => {
    micRef.current = micLevel;
  }, [micLevel]);

  useEffect(() => {
    interactRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    return () => {
      rig.dispose();
    };
  }, [rig]);

  const animStateRef = useRef({
    elapsed: 0,
    blinkTimer: 2.4,
    blinkAmount: 0,
    smoothAudio: 0,
    clickBounce: 0,
  });

  useFrame((_, rawDelta) => {
    const dt = Math.min(0.08, rawDelta);
    const anim = animStateRef.current;
    anim.elapsed += dt;
    const elapsed = anim.elapsed;

    const currentState = stateRef.current;
    const pointerX = pointerRef.current.x;
    const pointerY = pointerRef.current.y;

    const activeAudio =
      currentState === 'listening'
        ? clampAudioLevel(micRef.current || 0.28 + Math.sin(elapsed * 4.2) * 0.14, reducedMotion)
        : currentState === 'speaking'
        ? clampAudioLevel(pulseRef.current || 0.35 + Math.sin(elapsed * 8.5) * 0.25, reducedMotion)
        : 0;
    anim.smoothAudio = THREE.MathUtils.damp(anim.smoothAudio, activeAudio, 10, dt);
    const smoothAudio = anim.smoothAudio;

    // 1. Blinking
    anim.blinkTimer -= dt;
    if (anim.blinkTimer <= 0) {
      anim.blinkTimer = 2.8 + Math.random() * 2.4;
    }
    const isBlinking = anim.blinkTimer > 2.58;
    anim.blinkAmount = THREE.MathUtils.damp(anim.blinkAmount, isBlinking ? 1 : 0, 18, dt);
    const lidBase = currentState === 'happy' ? -1.06 : -1.26;
    const lidAngle = THREE.MathUtils.lerp(lidBase, 0.22, anim.blinkAmount);
    rig.leftEyelid.rotation.x = lidAngle;
    rig.rightEyelid.rotation.x = lidAngle;

    // 2. Eyeball gaze tracking
    const targetEyeY = pointerX * 0.16 * motionScale;
    const targetEyeX = -pointerY * 0.11 * motionScale;
    rig.leftEyeBall.rotation.y = THREE.MathUtils.damp(rig.leftEyeBall.rotation.y, targetEyeY, 10, dt);
    rig.leftEyeBall.rotation.x = THREE.MathUtils.damp(rig.leftEyeBall.rotation.x, targetEyeX, 10, dt);
    rig.rightEyeBall.rotation.y = THREE.MathUtils.damp(rig.rightEyeBall.rotation.y, targetEyeY, 10, dt);
    rig.rightEyeBall.rotation.x = THREE.MathUtils.damp(rig.rightEyeBall.rotation.x, targetEyeX, 10, dt);

    // 3. Eyebrows & ears
    let browLift = 0;
    let browTilt = 0.16;
    if (currentState === 'welcoming' || currentState === 'happy') {
      browLift = 0.025;
      browTilt = 0.22;
    } else if (currentState === 'listening') {
      browLift = 0.02;
      browTilt = 0.19;
    } else if (currentState === 'thinking') {
      browLift = -0.01;
      browTilt = -0.08;
    }
    rig.leftBrow.position.y = THREE.MathUtils.damp(rig.leftBrow.position.y, 0.215 + browLift, 8, dt);
    rig.rightBrow.position.y = THREE.MathUtils.damp(rig.rightBrow.position.y, 0.215 + browLift, 8, dt);
    rig.leftBrow.rotation.z = THREE.MathUtils.damp(rig.leftBrow.rotation.z, Math.PI / 2 + browTilt, 8, dt);
    rig.rightBrow.rotation.z = THREE.MathUtils.damp(rig.rightBrow.rotation.z, Math.PI / 2 - browTilt, 8, dt);

    const earPerk =
      currentState === 'listening' ? 0.18 + smoothAudio * 0.15 : currentState === 'happy' ? 0.14 : 0;
    rig.leftEar.rotation.x = THREE.MathUtils.damp(rig.leftEar.rotation.x, earPerk, 9, dt);
    rig.rightEar.rotation.x = THREE.MathUtils.damp(rig.rightEar.rotation.x, earPerk, 9, dt);

    // 4. Breathing & bounce (synced with EnvironmentShell platform levitation)
    const breath = Math.sin(elapsed * 2.1) * motionScale;
    rig.bodyGroup.scale.set(1 + breath * 0.013, 1 - breath * 0.012, 1 + breath * 0.013);

    anim.clickBounce = THREE.MathUtils.damp(anim.clickBounce, 0, 6, dt);
    const stateBounce =
      currentState === 'happy'
        ? Math.abs(Math.sin(elapsed * 5.2)) * 0.065 * motionScale
        : currentState === 'speaking'
        ? Math.abs(Math.sin(elapsed * 6.5)) * 0.016 * motionScale
        : 0;
    rig.bodyGroup.position.y = anim.clickBounce * 0.09 + stateBounce;

    const platformLift = Math.sin(elapsed * 1.4) * 0.025 * motionScale;
    rig.lionRoot.position.y = 0.01 + platformLift;

    // 5. Head orientation
    let targetHeadY = pointerX * 0.24 * motionScale;
    let targetHeadX = -pointerY * 0.14 * motionScale;
    let targetHeadZ = 0;

    if (currentState === 'welcoming') {
      targetHeadY = Math.sin(elapsed * 1.6) * 0.14 * motionScale + pointerX * 0.1;
      targetHeadX = -0.05 + Math.sin(elapsed * 2.2) * 0.04 * motionScale;
      targetHeadZ = 0.06;
    } else if (currentState === 'listening') {
      targetHeadZ = 0.12;
      targetHeadX = -0.07;
      targetHeadY = pointerX * 0.12 * motionScale;
    } else if (currentState === 'thinking') {
      targetHeadY = Math.sin(elapsed * 1.35) * 0.17 * motionScale;
      targetHeadX = -0.15;
      targetHeadZ = -0.1;
    } else if (currentState === 'speaking') {
      targetHeadY = Math.sin(elapsed * 2.3) * 0.09 * motionScale + pointerX * 0.1;
      targetHeadX = Math.sin(elapsed * 4.2) * 0.045 * motionScale;
    } else if (currentState === 'happy') {
      targetHeadY = Math.sin(elapsed * 3.1) * 0.12 * motionScale;
      targetHeadX = -0.08 + Math.sin(elapsed * 5.0) * 0.05 * motionScale;
    }

    _targetRot.set(targetHeadX, targetHeadY);
    rig.headGroup.rotation.x = THREE.MathUtils.damp(rig.headGroup.rotation.x, _targetRot.x, 7, dt);
    rig.headGroup.rotation.y = THREE.MathUtils.damp(rig.headGroup.rotation.y, _targetRot.y, 7, dt);
    rig.headGroup.rotation.z = THREE.MathUtils.damp(rig.headGroup.rotation.z, targetHeadZ, 6, dt);

    // 6. Jaw animation
    const jawTarget =
      currentState === 'speaking' ? 0.04 + smoothAudio * 0.24 : currentState === 'happy' ? 0.07 : 0;
    rig.jawGroup.rotation.x = THREE.MathUtils.damp(rig.jawGroup.rotation.x, jawTarget, 18, dt);

    // 7. Arm choreography
    const rightWave =
      anim.clickBounce > 0.15 || currentState === 'welcoming'
        ? -1.12 + Math.sin(elapsed * (anim.clickBounce > 0.15 ? 14 : 6.2)) * 0.24 * motionScale
        : currentState === 'happy'
        ? -1.05 + Math.sin(elapsed * 7.5) * 0.18 * motionScale
        : currentState === 'speaking'
        ? -0.24 + Math.sin(elapsed * 4.5) * 0.15 * motionScale
        : currentState === 'thinking'
        ? -0.52
        : Math.sin(elapsed * 1.6) * 0.05 * motionScale;

    const leftGesture =
      currentState === 'happy'
        ? 1.05 - Math.sin(elapsed * 7.5) * 0.18 * motionScale
        : currentState === 'speaking'
        ? 0.2 + Math.cos(elapsed * 4.0) * 0.11 * motionScale
        : Math.sin(elapsed * 1.6 + 1) * 0.04 * motionScale;

    rig.rightArmGroup.rotation.z = THREE.MathUtils.damp(rig.rightArmGroup.rotation.z, -rightWave, 8, dt);
    rig.leftArmGroup.rotation.z = THREE.MathUtils.damp(rig.leftArmGroup.rotation.z, -leftGesture, 8, dt);

    // 8. Tail wag & collar spin
    const tailSpeed = currentState === 'happy' ? 5.8 : currentState === 'listening' ? 4.4 : 2.1;
    rig.tailGroup.rotation.y =
      Math.sin(elapsed * tailSpeed) * (currentState === 'happy' ? 0.22 : 0.14) * motionScale;
    rig.emblem.rotation.y += dt * (currentState === 'thinking' ? 2.6 : 0.65) * motionScale;

    // 9. Thinking crystals
    rig.thinkingGroup.visible = currentState === 'thinking';
    if (rig.thinkingGroup.visible) {
      rig.thinkingGroup.rotation.y += dt * 1.8 * motionScale;
      rig.thinkingGroup.position.y = 1.88 + Math.sin(elapsed * 2.5) * 0.04 * motionScale;
    }
  });

  return (
    <primitive
      object={rig.sceneRoot}
      onPointerDown={(e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        animStateRef.current.clickBounce = 1.0;
        interactRef.current?.();
      }}
    />
  );
};

export default LionModelR3F;
