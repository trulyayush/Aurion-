import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { LionState } from '../../types/finance';
import { CameraPreset, getCameraPresetConfig } from '../../utils/scene3dMetrics';
import {
  applyRoomEnvironment,
  detectSoftwareWebGL,
  isWebGLAvailable,
  prefersReducedMotion,
  scheduleAfterDraw,
} from '../../utils/threeStudio';
import { EnvironmentShell } from './EnvironmentShell';
import { useThreeScene } from './ThreeSceneContext';

const LazyLionModelR3F = React.lazy(() => import('./LionModelR3F'));

export interface ThreeSceneManagerProps {
  /** Built-in preset for lighting, fog, and camera framing */
  cameraPreset?: CameraPreset;
  /** Whether to automatically host the 3D White Lion companion inside this container */
  showLion?: boolean;
  /** Whether to mount the EnvironmentShell (floor platform + floating geometry particles) */
  showEnvironmentShell?: boolean;
  lionState?: LionState;
  speechPulse?: number;
  micLevel?: number;
  onLionInteract?: () => void;
  /** Enables full interactive OrbitControls zoom & wider angles for inspecting 3D financial & goal scenes */
  enableOrbit?: boolean;
  /** Additional 3D elements (financial visualizations, goal sculptures, particles) */
  children?: React.ReactNode;
  /** Accessible label for the WebGL canvas */
  ariaLabel?: string;
  /** Test identifier for browser verification */
  testId?: string;
  /** Fallback node rendered when WebGL is unsupported or context is lost */
  fallback?: React.ReactNode;
  className?: string;
  fogColor?: string;
  shadowExtent?: number;
  onClickContainer?: () => void;
}

const StudioEnvironmentAndLighting: React.FC<{
  isSoftwareGl: boolean;
  fogColor: string;
  shadowExtent: number;
}> = ({ isSoftwareGl, fogColor, shadowExtent }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    const envTex = applyRoomEnvironment(gl, scene);
    return () => {
      scene.environment = null;
      envTex.dispose();
    };
  }, [gl, scene]);

  return (
    <>
      <fogExp2 attach="fog" args={[fogColor, 0.038]} />
      {/* Soft minimal ambient + warm/cool directional studio rig */}
      <ambientLight color="#F6F4EF" intensity={0.38} />
      <hemisphereLight args={[0xf4f8f6, 0xd8d1c2, 0.72]} position={[0, 8, 0]} />
      <directionalLight
        color={0xfff5e4}
        intensity={1.55}
        position={[3.4, 5.2, 4.4]}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight color={0xcfe4db} intensity={0.9} position={[-3.6, 3.2, -3.4]} />
    </>
  );
};

const CameraAndOrbitController: React.FC<{
  preset: CameraPreset;
  lionState: LionState;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  enableOrbit: boolean;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}> = ({ preset, lionState, pointerRef, enableOrbit, isSoftwareGl, reducedMotion }) => {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const userOrbitingRef = useRef(false);
  const hasUserOrbitedRef = useRef(false);
  const motionScale = reducedMotion ? 0.35 : 1.0;

  const presetConfig = useMemo(
    () => getCameraPresetConfig(preset, lionState),
    [preset, lionState]
  );

  // Sync PerspectiveCamera & OrbitControls target cleanly on mount / preset change
  const lastPresetRef = useRef<CameraPreset | null>(null);
  useEffect(() => {
    if (lastPresetRef.current !== preset) {
      lastPresetRef.current = preset;
      hasUserOrbitedRef.current = false;
      camera.position.set(...presetConfig.position);
      if (controlsRef.current) {
        controlsRef.current.target.set(...presetConfig.target);
        controlsRef.current.update();
      } else {
        camera.lookAt(...presetConfig.target);
      }
    }
  }, [camera, preset, presetConfig]);

  useFrame((_, rawDelta) => {
    if (userOrbitingRef.current) return;
    const dt = Math.min(0.08, rawDelta);
    const [pxStrength, pyStrength] = presetConfig.parallaxStrength;

    // Gentle damped framing & pointer parallax before manual orbit takeover
    if (!hasUserOrbitedRef.current) {
      const targetX = presetConfig.position[0] + pointerRef.current.x * pxStrength * motionScale;
      const targetY = presetConfig.position[1] + pointerRef.current.y * pyStrength * motionScale;
      const targetZ = presetConfig.position[2];

      camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, dt);
      controlsRef.current?.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      target={presetConfig.target}
      enableDamping={!isSoftwareGl}
      dampingFactor={0.06}
      enablePan={false}
      enableZoom={enableOrbit}
      rotateSpeed={enableOrbit ? 0.72 : 0.42}
      minDistance={enableOrbit ? 2.2 : 3.6}
      maxDistance={enableOrbit ? 7.6 : 5.8}
      minAzimuthAngle={enableOrbit ? -Infinity : -0.45}
      maxAzimuthAngle={enableOrbit ? Infinity : 0.45}
      minPolarAngle={enableOrbit ? Math.PI * 0.14 : Math.PI * 0.34}
      maxPolarAngle={Math.PI * 0.48}
      onStart={() => {
        userOrbitingRef.current = true;
        hasUserOrbitedRef.current = true;
      }}
      onEnd={() => {
        userOrbitingRef.current = false;
      }}
    />
  );
};

const SoftwareGlPacer: React.FC<{ isSoftwareGl: boolean }> = ({ isSoftwareGl }) => {
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

export const ThreeSceneManager: React.FC<ThreeSceneManagerProps> = ({
  cameraPreset = 'lion',
  showLion = false,
  showEnvironmentShell,
  lionState = 'idle',
  speechPulse = 0,
  micLevel = 0,
  onLionInteract,
  enableOrbit = false,
  children,
  ariaLabel = 'AURION interactive 3D studio scene',
  testId = 'three-scene-manager',
  fallback,
  className = '',
  fogColor = '#EBF0E9',
  shadowExtent = 2.6,
  onClickContainer,
}) => {
  const sceneCtx = useThreeScene();
  const {
    isSoftwareGl: ctxSoftwareGl,
    reducedMotion: ctxReducedMotion,
    setGlobalLionState,
    notifyInteraction,
  } = sceneCtx;
  const isSoftwareGl = useMemo(() => ctxSoftwareGl ?? detectSoftwareWebGL(), [ctxSoftwareGl]);
  const reducedMotion = useMemo(() => ctxReducedMotion ?? prefersReducedMotion(), [ctxReducedMotion]);
  const [webglLostOrUnsupported, setWebglLostOrUnsupported] = useState(
    () => !isWebGLAvailable()
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const initialCamera = useMemo(
    () => getCameraPresetConfig(cameraPreset, lionState),
    [cameraPreset, lionState]
  );

  const shouldRenderEnvironmentShell = showEnvironmentShell ?? showLion;

  useEffect(() => {
    if (showLion) {
      setGlobalLionState(lionState);
    }
  }, [lionState, setGlobalLionState, showLion]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    pointerRef.current.x = THREE.MathUtils.clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    pointerRef.current.y = THREE.MathUtils.clamp(-(((e.clientY - rect.top) / rect.height) * 2 - 1), -1, 1);
  };

  const handlePointerLeave = () => {
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
  };

  if (webglLostOrUnsupported) {
    return (
      <div
        data-testid={`${testId}-fallback`}
        className={`relative w-full h-full ${className}`}
      >
        {fallback || (
          <div className="w-full h-full flex flex-col items-center justify-center rounded-2xl bg-[#EBF0E9] border border-[#DCE2DA] p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#183B32] text-[#F6F4EF] flex items-center justify-center font-display font-bold text-2xl border-2 border-[#C4AD7D]">
              A
            </div>
            <div className="mt-2 font-display font-semibold text-sm text-[#202321]">
              AURION 3D Studio
            </div>
            <p className="text-xs text-[#5C635E] mt-1">
              WebGL preview unavailable in this environment.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      data-lion-state={showLion ? lionState : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={onClickContainer}
      aria-label={ariaLabel}
      className={`relative w-full h-full select-none ${className}`}
    >
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
        onPointerMissed={() => {
          if (showLion) {
            notifyInteraction();
            onLionInteract?.();
          }
        }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
          gl.domElement.setAttribute('aria-label', ariaLabel);
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              e.preventDefault();
              setWebglLostOrUnsupported(true);
            },
            { once: true }
          );
        }}
      >
        <PerspectiveCamera
          makeDefault
          fov={initialCamera.fov}
          near={0.1}
          far={45}
          position={initialCamera.position}
        />

        <StudioEnvironmentAndLighting
          isSoftwareGl={isSoftwareGl}
          fogColor={fogColor}
          shadowExtent={shadowExtent}
        />

        <CameraAndOrbitController
          preset={cameraPreset}
          lionState={lionState}
          pointerRef={pointerRef}
          enableOrbit={enableOrbit}
          isSoftwareGl={isSoftwareGl}
          reducedMotion={reducedMotion}
        />

        <SoftwareGlPacer isSoftwareGl={isSoftwareGl} />

        {shouldRenderEnvironmentShell && (
          <EnvironmentShell
            lionState={lionState}
            speechPulse={speechPulse}
            micLevel={micLevel}
            showHalo={showLion}
            showPlatform
            pointerRef={pointerRef}
            reducedMotion={reducedMotion}
          />
        )}

        {showLion && (
          <Suspense fallback={null}>
            <LazyLionModelR3F
              state={lionState}
              speechPulse={speechPulse}
              micLevel={micLevel}
              onInteract={() => {
                notifyInteraction();
                onLionInteract?.();
              }}
              pointerRef={pointerRef}
              isSoftwareGl={isSoftwareGl}
            />
          </Suspense>
        )}

        {children}
      </Canvas>
    </div>
  );
};
