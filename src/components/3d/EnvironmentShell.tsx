import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LionState } from '../../types/finance';
import { clampAudioLevel } from '../../utils/scene3dMetrics';
import {
  createContactShadowTexture,
  createPlinthSurfaceTexture,
} from '../../utils/threeStudio';

export interface EnvironmentShellProps {
  lionState?: LionState;
  speechPulse?: number;
  micLevel?: number;
  /** Shows the state-reactive halo ring, expanding voice waves, and subtle point light */
  showHalo?: boolean;
  /** Renders the stepped architectural floor platform in addition to floating particles */
  showPlatform?: boolean;
  pointerRef?: React.MutableRefObject<{ x: number; y: number }>;
  reducedMotion?: boolean;
}

const _haloColorTarget = new THREE.Color();
const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();

const STATE_HALO_COLORS: Record<LionState, number> = {
  welcoming: 0xd6ba82, // Warm sunlit champagne gold
  idle: 0xc4ad7d, // Champagne gold
  listening: 0x3b8c6e, // Deep emerald-sage
  thinking: 0xd9a441, // Warm amber gold
  speaking: 0x2f6f5e, // Deep forest-emerald highlight
  happy: 0xe3bf67, // Celebratory bright gold
};

const BG_CLUSTERS: Array<{ pos: [number, number, number]; scale: number; withRing: boolean }> = [
  { pos: [-1.45, 1.85, -1.75], scale: 1.0, withRing: false },
  { pos: [1.52, 1.58, -1.9], scale: 0.85, withRing: true },
  { pos: [-1.25, 0.42, -1.45], scale: 0.7, withRing: true },
  { pos: [1.38, 0.55, -1.6], scale: 0.78, withRing: false },
  { pos: [0.05, 2.25, -2.35], scale: 1.15, withRing: true },
];

export const EnvironmentShell: React.FC<EnvironmentShellProps> = ({
  lionState = 'idle',
  speechPulse = 0,
  micLevel = 0,
  showHalo = true,
  showPlatform = true,
  pointerRef,
  reducedMotion = false,
}) => {
  const { gl } = useThree();
  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const motionScale = reducedMotion ? 0.35 : 1.0;

  const platformGroupRef = useRef<THREE.Group | null>(null);
  const parallaxBgGroupRef = useRef<THREE.Group | null>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const haloLightRef = useRef<THREE.PointLight | null>(null);
  const soundRingRefs = useRef<Array<THREE.Mesh | null>>([]);

  const stateRef = useRef<LionState>(lionState);
  const pulseRef = useRef<number>(speechPulse);
  const micRef = useRef<number>(micLevel);
  const elapsedRef = useRef(0);
  const smoothAudioRef = useRef(0);

  useEffect(() => {
    stateRef.current = lionState;
  }, [lionState]);

  useEffect(() => {
    pulseRef.current = speechPulse;
  }, [speechPulse]);

  useEffect(() => {
    micRef.current = micLevel;
  }, [micLevel]);

  const assets = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    const plinthTex = createPlinthSurfaceTexture(maxAnisotropy);
    const shadowTex = createContactShadowTexture();
    textures.push(plinthTex, shadowTex);

    // Soft metallic architectural platform materials matching AURION palette
    const plinthStoneMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: plinthTex,
        roughness: 0.28,
        metalness: 0.34,
        clearcoat: 0.35,
        clearcoatRoughness: 0.26,
      })
    );

    const brushedGoldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc4ad7d,
        roughness: 0.2,
        metalness: 0.9,
        anisotropy: 0.75,
        clearcoat: 0.3,
      })
    );

    const glassCollarMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xa5b4a4,
        roughness: 0.14,
        metalness: 0.08,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );

    const lowerHubMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x183b32,
        roughness: 0.38,
        metalness: 0.28,
      })
    );

    const contactShadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );

    const haloMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc4ad7d,
        emissive: 0xc4ad7d,
        emissiveIntensity: 0.35,
        roughness: 0.26,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
      })
    );

    const soundRingMats = [0, 1, 2].map(() =>
      trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x3b8c6e,
          emissive: 0x3b8c6e,
          emissiveIntensity: 0.65,
          roughness: 0.25,
          metalness: 0.4,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      )
    );

    const particleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xe6d6af,
        emissive: 0xc4ad7d,
        emissiveIntensity: 0.45,
        roughness: 0.28,
        metalness: 0.55,
        transparent: true,
        opacity: 0.78,
      })
    );

    // Primitives
    const mainDiscGeo = trackGeo(new THREE.CylinderGeometry(1.12, 1.02, 0.12, 48));
    const goldTrimGeo = trackGeo(new THREE.TorusGeometry(1.1, 0.024, 14, 56));
    const glassCollarGeo = trackGeo(new THREE.CylinderGeometry(0.98, 0.72, 0.08, 40));
    const lowerFinGeo = trackGeo(new THREE.ConeGeometry(0.56, 0.24, 32));
    const statusRingGeo = trackGeo(new THREE.TorusGeometry(1.24, 0.015, 12, 64));
    const contactShadowGeo = trackGeo(new THREE.CircleGeometry(0.84, 32));
    const soundRingGeo = trackGeo(new THREE.TorusGeometry(0.82, 0.014, 10, 56));
    const bgAccentGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
    const bgRingGeo = trackGeo(new THREE.TorusGeometry(0.2, 0.008, 8, 36));
    const particleGeo = trackGeo(new THREE.IcosahedronGeometry(0.022, 0));

    const particleCount = 36;
    const particleSeeds = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2 + (i % 3) * 0.4,
      radius: 0.95 + (i % 5) * 0.22,
      yBase: 0.15 + ((i * 0.37) % 2.1),
      speed: 0.18 + (i % 4) * 0.06,
      scale: 0.55 + (i % 4) * 0.28,
      phase: i * 0.73,
    }));

    return {
      plinthStoneMat,
      brushedGoldMat,
      glassCollarMat,
      lowerHubMat,
      contactShadowMat,
      haloMat,
      soundRingMats,
      particleMat,
      mainDiscGeo,
      goldTrimGeo,
      glassCollarGeo,
      lowerFinGeo,
      statusRingGeo,
      contactShadowGeo,
      soundRingGeo,
      bgAccentGeo,
      bgRingGeo,
      particleGeo,
      particleSeeds,
      dispose: () => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
      },
    };
  }, [maxAnisotropy]);

  useEffect(() => {
    const mesh = particleMeshRef.current;
    if (mesh) {
      assets.particleSeeds.forEach((p, idx) => {
        _dummyPos.set(Math.cos(p.angle) * p.radius, p.yBase, Math.sin(p.angle) * p.radius);
        _dummyQuat.identity();
        _dummyScale.setScalar(p.scale);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(idx, _dummyMat);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    return () => {
      assets.dispose();
    };
  }, [assets]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(0.08, rawDelta);
    elapsedRef.current += dt;
    const elapsed = elapsedRef.current;

    const currentState = stateRef.current;
    const pointerX = pointerRef?.current.x ?? 0;
    const pointerY = pointerRef?.current.y ?? 0;

    const activeAudio =
      currentState === 'listening'
        ? clampAudioLevel(micRef.current || 0.28 + Math.sin(elapsed * 4.2) * 0.14, reducedMotion)
        : currentState === 'speaking'
        ? clampAudioLevel(pulseRef.current || 0.35 + Math.sin(elapsed * 8.5) * 0.25, reducedMotion)
        : 0;
    smoothAudioRef.current = THREE.MathUtils.damp(smoothAudioRef.current, activeAudio, 10, dt);
    const smoothAudio = smoothAudioRef.current;

    // 1. Subtle platform levitation
    if (platformGroupRef.current) {
      platformGroupRef.current.position.y = Math.sin(elapsed * 1.4) * 0.025 * motionScale;
    }

    // 2. State-reactive halo ring, point light & voice sound waves
    if (showPlatform && showHalo) {
      _haloColorTarget.setHex(STATE_HALO_COLORS[currentState]);
      assets.haloMat.color.lerp(_haloColorTarget, Math.min(1, dt * 6));
      assets.haloMat.emissive.lerp(_haloColorTarget, Math.min(1, dt * 6));
      assets.haloMat.emissiveIntensity =
        currentState === 'idle' ? 0.25 : 0.55 + smoothAudio * 0.75;

      if (haloLightRef.current) {
        haloLightRef.current.color.copy(assets.haloMat.color);
        haloLightRef.current.intensity =
          currentState === 'idle' ? 0.55 : 0.75 + smoothAudio * 1.45;
      }

      const showSoundRings =
        currentState === 'listening' || currentState === 'speaking' || currentState === 'happy';
      soundRingRefs.current.forEach((ring, idx) => {
        if (!ring) return;
        ring.visible = showSoundRings;
        const rMat = assets.soundRingMats[idx];
        if (!showSoundRings || !rMat) return;
        const cycle = (elapsed * (currentState === 'listening' ? 1.15 : 0.85) + idx * 0.33) % 1;
        const expand = 0.86 + cycle * (0.48 + smoothAudio * 0.36);
        ring.scale.set(expand, expand, 1);
        ring.position.y = 0.04 + cycle * 0.34;
        rMat.color.copy(_haloColorTarget);
        rMat.emissive.copy(_haloColorTarget);
        rMat.opacity = (1 - cycle) * (0.28 + smoothAudio * 0.52);
      });
    }

    // 3. Lightweight floating geometry particle drift (zero GC allocations)
    if (particleMeshRef.current) {
      assets.particleSeeds.forEach((p, idx) => {
        const yRange = 2.25;
        const yDrift =
          ((p.yBase + elapsed * p.speed * motionScale * (1 + smoothAudio * 1.3)) % yRange) + 0.1;
        const swirl = p.angle + elapsed * 0.14 * motionScale;
        const radialPulse =
          p.radius + Math.sin(elapsed * 1.5 + p.phase) * 0.06 + smoothAudio * 0.12;
        _dummyPos.set(Math.cos(swirl) * radialPulse, yDrift, Math.sin(swirl) * radialPulse - 0.15);
        _dummyEuler.set(elapsed * 0.6 + p.phase, elapsed * 0.4, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.setScalar(p.scale * (1 + smoothAudio * 0.35));
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMeshRef.current!.setMatrixAt(idx, _dummyMat);
      });
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Gentle multi-layer background geometric depth parallax
    if (parallaxBgGroupRef.current) {
      parallaxBgGroupRef.current.position.x = THREE.MathUtils.damp(
        parallaxBgGroupRef.current.position.x,
        -pointerX * 0.16 * motionScale,
        4,
        dt
      );
      parallaxBgGroupRef.current.position.y = THREE.MathUtils.damp(
        parallaxBgGroupRef.current.position.y,
        -pointerY * 0.1 * motionScale,
        4,
        dt
      );
      parallaxBgGroupRef.current.children.forEach((child, idx) => {
        child.rotation.y += dt * (0.22 + idx * 0.04) * motionScale;
        child.rotation.x += dt * 0.12 * motionScale;
      });
    }
  });

  return (
    <group name="aurion-environment-shell">
      {/* 1. Stepped Soft-Metallic Architectural Floor Platform */}
      {showPlatform && (
        <group ref={platformGroupRef}>
          <mesh
            geometry={assets.mainDiscGeo}
            material={assets.plinthStoneMat}
            position={[0, -0.06, 0]}
            receiveShadow
          />
          <mesh
            geometry={assets.goldTrimGeo}
            material={assets.brushedGoldMat}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0.002, 0]}
          />
          <mesh
            geometry={assets.glassCollarGeo}
            material={assets.glassCollarMat}
            position={[0, -0.15, 0]}
          />
          <mesh
            geometry={assets.lowerFinGeo}
            material={assets.lowerHubMat}
            rotation={[Math.PI, 0, 0]}
            position={[0, -0.3, 0]}
          />
          <mesh
            geometry={assets.contactShadowGeo}
            material={assets.contactShadowMat}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.018, 0]}
          />

          {showHalo && (
            <>
              <mesh
                geometry={assets.statusRingGeo}
                material={assets.haloMat}
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0.015, 0]}
              />
              {assets.soundRingMats.map((rMat, idx) => (
                <mesh
                  key={idx}
                  ref={(el) => {
                    soundRingRefs.current[idx] = el;
                  }}
                  geometry={assets.soundRingGeo}
                  material={rMat}
                  rotation={[Math.PI / 2, 0, 0]}
                  position={[0, 0.06 + idx * 0.08, 0]}
                  visible={false}
                />
              ))}
              <pointLight
                ref={haloLightRef}
                color={0xc4ad7d}
                intensity={0.65}
                distance={4.5}
                decay={2}
                position={[0, 0.45, 0.85]}
              />
            </>
          )}
        </group>
      )}

      {/* 2. Subtle Parallax Floating Geometric Accents */}
      <group ref={parallaxBgGroupRef}>
        {BG_CLUSTERS.map((cluster, idx) => (
          <group key={idx} position={cluster.pos}>
            <mesh
              geometry={assets.bgAccentGeo}
              material={idx % 2 === 0 ? assets.brushedGoldMat : assets.glassCollarMat}
              scale={cluster.scale}
            />
            {cluster.withRing && (
              <mesh
                geometry={assets.bgRingGeo}
                material={idx % 2 === 0 ? assets.glassCollarMat : assets.brushedGoldMat}
                scale={cluster.scale}
                rotation={[0.5 + idx * 0.3, idx * 0.4, 0.2]}
              />
            )}
          </group>
        ))}
      </group>

      {/* 3. Lightweight Instanced Floating Geometry Particles */}
      <instancedMesh
        ref={particleMeshRef}
        args={[assets.particleGeo, assets.particleMat, assets.particleSeeds.length]}
        frustumCulled={false}
      />
    </group>
  );
};
