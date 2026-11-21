import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, addAfterEffect, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { AnimatePresence, motion } from 'motion/react';
import * as THREE from 'three';
import {
  LOADING_STAGE_MESSAGES,
  LoadingStageKey,
} from '../../utils/loadingSequence';
import {
  detectSoftwareWebGL,
  isWebGLAvailable,
  prefersReducedMotion,
  scheduleAfterDraw,
} from '../../utils/threeStudio';
import { LoadingLionScene } from './LoadingLionScene';

export interface AurionLoadingScreenProps {
  stage: LoadingStageKey;
  isExiting: boolean;
  onSceneReady: () => void;
  onExitComplete: () => void;
}

const LoadingSoftwareGlPacer: React.FC<{ isSoftwareGl: boolean }> = ({ isSoftwareGl }) => {
  const { gl, invalidate } = useThree();

  useEffect(() => {
    if (!isSoftwareGl) return;
    let disposed = false;
    let pending = false;
    let timerId = 0;

    const scheduleNext = () => {
      if (disposed || pending) return;
      pending = true;
      scheduleAfterDraw(
        gl,
        () => disposed,
        (id) => {
          timerId = id;
        },
        () => {
          pending = false;
          if (!disposed) invalidate();
        },
        80
      );
    };

    const removeAfterEffect = addAfterEffect(() => {
      scheduleNext();
    });

    invalidate();

    return () => {
      disposed = true;
      clearTimeout(timerId);
      removeAfterEffect();
    };
  }, [gl, invalidate, isSoftwareGl]);

  return null;
};

export const AurionLoadingScreen: React.FC<AurionLoadingScreenProps> = ({
  stage,
  isExiting,
  onSceneReady,
  onExitComplete,
}) => {
  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const [webglFailed, setWebglFailed] = useState(() => !isWebGLAvailable());
  const pointerRef = useRef({ x: 0, y: 0 });
  const notifiedReadyRef = useRef(false);

  const signalSceneReady = React.useCallback(() => {
    if (notifiedReadyRef.current) return;
    notifiedReadyRef.current = true;
    onSceneReady();
  }, [onSceneReady]);

  // If WebGL is unavailable or lost, notify readiness immediately so fallback never blocks entry
  useEffect(() => {
    if (webglFailed) {
      signalSceneReady();
    }
  }, [webglFailed, signalSceneReady]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerRef.current.x = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointerRef.current.y = THREE.MathUtils.clamp(-(((e.clientY - rect.top) / rect.height) * 2 - 1), -1, 1);
  };

  const handlePointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  const statusText = LOADING_STAGE_MESSAGES[stage];
  const exitDuration = reducedMotion ? 0.28 : 0.68;

  return (
    <motion.div
      data-testid="aurion-loading-screen"
      data-loading-stage={stage}
      data-exiting={isExiting ? 'true' : 'false'}
      role="status"
      aria-live="polite"
      aria-label={`Loading AURION: ${statusText}`}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: exitDuration, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (isExiting) {
          onExitComplete();
        }
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`fixed inset-0 z-50 flex flex-col justify-end overflow-hidden select-none ${
        isExiting ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 50% 38%, #183B32 0%, #0E2720 46%, #071411 100%)',
      }}
    >
      {/* Subtle atmospheric top-spotlight bloom (purely radial CSS, no harsh neon) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle 420px at 50% 36%, rgba(196, 173, 125, 0.11) 0%, rgba(24, 59, 50, 0.04) 48%, transparent 78%)',
        }}
      />

      {/* Full-Screen 3D Scene Canvas */}
      <div className="absolute inset-0">
        {webglFailed ? (
          <div
            data-testid="aurion-loading-fallback"
            className="w-full h-full flex items-center justify-center pb-28"
          >
            <motion.div
              initial={reducedMotion ? { opacity: 0.9 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative flex items-center justify-center"
            >
              <div className="w-40 h-40 rounded-full border border-[#C4AD7D]/30 flex items-center justify-center">
                <div className="w-28 h-28 rounded-full border border-[#C4AD7D]/55 bg-[#123028] flex items-center justify-center shadow-2xl">
                  <span className="font-display text-4xl font-semibold tracking-wider text-[#F6F4EF]">
                    A
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <Canvas
            dpr={isSoftwareGl ? 1 : [1, 2]}
            shadows={!isSoftwareGl}
            frameloop={isSoftwareGl ? 'demand' : 'always'}
            gl={{
              antialias: !isSoftwareGl,
              alpha: true,
              preserveDrawingBuffer: isSoftwareGl,
              powerPreference: 'high-performance',
            }}
            onCreated={({ gl }) => {
              gl.outputColorSpace = THREE.SRGBColorSpace;
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.08;
              gl.domElement.setAttribute('aria-label', 'AURION 3D introductory scene');
              gl.domElement.addEventListener(
                'webglcontextlost',
                (e) => {
                  e.preventDefault();
                  setWebglFailed(true);
                  signalSceneReady();
                },
                { once: true }
              );
            }}
          >
            <PerspectiveCamera makeDefault fov={32} near={0.1} far={45} position={[0, 1.88, 7.2]} />
            <LoadingSoftwareGlPacer isSoftwareGl={isSoftwareGl} />
            <Suspense fallback={null}>
              <LoadingLionScene
                isSoftwareGl={isSoftwareGl}
                reducedMotion={reducedMotion}
                isExiting={isExiting}
                pointerRef={pointerRef}
                onSceneReady={signalSceneReady}
              />
            </Suspense>
          </Canvas>
        )}
      </div>

      {/* Restrained Luxury Brand Reveal & Minimal Status Overlay (Lower Band) */}
      <motion.div
        animate={{ opacity: isExiting ? 0 : 1, y: isExiting ? 8 : 0 }}
        transition={{ duration: reducedMotion ? 0.2 : 0.42, ease: 'easeOut' }}
        className="relative z-10 w-full px-6 pb-8 sm:pb-10 flex flex-col items-center text-center pointer-events-none"
      >
        <motion.h1
          initial={
            reducedMotion
              ? { opacity: 1, letterSpacing: '0.28em' }
              : { opacity: 0, letterSpacing: '0.44em', y: 10 }
          }
          animate={{ opacity: 1, letterSpacing: '0.28em', y: 0 }}
          transition={{ duration: reducedMotion ? 0.3 : 1.05, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-3xl sm:text-4xl font-semibold text-[#F6F4EF] pl-[0.28em]"
        >
          AURION
        </motion.h1>

        <motion.p
          initial={reducedMotion ? { opacity: 0.85 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 0.82, y: 0 }}
          transition={{ duration: reducedMotion ? 0.25 : 0.9, delay: 0.38, ease: 'easeOut' }}
          className="mt-2.5 text-[10px] sm:text-xs font-medium tracking-[0.22em] text-[#C4AD7D] uppercase"
        >
          UNDERSTAND YOUR MONEY. MASTER YOUR FUTURE.
        </motion.p>

        {/* Minimal Indeterminate Orbital Shimmer Line (No fabricated %) */}
        <div className="mt-6 w-40 sm:w-48 h-[1.5px] rounded-full bg-[#F6F4EF]/12 overflow-hidden relative">
          {reducedMotion ? (
            <div className="h-full w-full bg-[#C4AD7D]/55" />
          ) : (
            <motion.div
              className="absolute inset-y-0 w-1/2 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(196, 173, 125, 0.95) 50%, transparent 100%)',
              }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 1.85, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </div>

        {/* Real Initialization Status Text */}
        <div className="mt-3 h-5 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={stage}
              data-testid="aurion-loading-status"
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 0.72, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: reducedMotion ? 0.12 : 0.26 }}
              className="text-xs tracking-[0.06em] text-[#F6F4EF]"
            >
              {statusText}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
