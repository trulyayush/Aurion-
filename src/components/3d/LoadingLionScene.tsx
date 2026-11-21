import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  applyRoomEnvironment,
  createContactShadowTexture,
  createPlinthSurfaceTexture,
} from '../../utils/threeStudio';
import { buildLionSceneRig } from './lionCharacterBuilder';

export interface LoadingLionSceneProps {
  isSoftwareGl: boolean;
  reducedMotion: boolean;
  isExiting: boolean;
  pointerRef: React.MutableRefObject<{ x: number; y: number }>;
  onSceneReady: () => void;
}

const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyEuler = new THREE.Euler();

function createVolumetricBeamMaterial(
  colorHex: number,
  initialOpacity: number
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uOpacity: { value: initialOpacity },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = mvPos.xyz;
        vViewNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vViewNormal;
      varying vec3 vViewPos;
      void main() {
        float facing = abs(dot(normalize(vViewNormal), normalize(-vViewPos)));
        float edgeFade = pow(clamp(facing, 0.0, 1.0), 2.35);
        float vFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.14, vUv.y);
        float streaks = 0.85 + 0.15 * sin(vUv.x * 37.699 + uTime * 0.28);
        gl_FragColor = vec4(uColor, uOpacity * edgeFade * vFade * streaks);
      }
    `,
  });
}

export const LoadingLionScene: React.FC<LoadingLionSceneProps> = ({
  isSoftwareGl,
  reducedMotion,
  isExiting,
  pointerRef,
  onSceneReady,
}) => {
  const { gl, scene, camera, size } = useThree();
  const motionScale = reducedMotion ? 0.35 : 1.0;

  const maxAnisotropy = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);
  const lionRig = useMemo(
    () => buildLionSceneRig(maxAnisotropy, isSoftwareGl),
    [maxAnisotropy, isSoftwareGl]
  );

  // Refs for lighting & animated groups
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const underGlowLightRef = useRef<THREE.PointLight | null>(null);
  const orbiterLightRef = useRef<THREE.PointLight | null>(null);
  const orbiterGroupRef = useRef<THREE.Group | null>(null);
  const ring1Ref = useRef<THREE.Mesh | null>(null);
  const ring2Ref = useRef<THREE.Mesh | null>(null);
  const ring3Ref = useRef<THREE.Mesh | null>(null);
  const platformGroupRef = useRef<THREE.Group | null>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const beamInnerRef = useRef<THREE.Mesh | null>(null);
  const beamOuterRef = useRef<THREE.Mesh | null>(null);

  const readyNotifiedRef = useRef(false);
  const exitingRef = useRef(isExiting);
  useEffect(() => {
    exitingRef.current = isExiting;
  }, [isExiting]);

  // Procedural studio PMREM reflection + volumetric beam + plinth + orbital assets
  useEffect(() => {
    const envTex = applyRoomEnvironment(gl, scene);
    return () => {
      scene.environment = null;
      envTex.dispose();
    };
  }, [gl, scene]);

  const stageAssets = useMemo(() => {
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

    const plinthMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        map: plinthTex,
        roughness: 0.26,
        metalness: 0.36,
        clearcoat: 0.38,
        clearcoatRoughness: 0.24,
      })
    );
    const goldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc4ad7d,
        emissive: 0x6b5832,
        emissiveIntensity: 0.22,
        roughness: 0.18,
        metalness: 0.92,
        clearcoat: 0.35,
      })
    );
    const darkHubMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f2720,
        roughness: 0.42,
        metalness: 0.28,
      })
    );
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      })
    );

    // Thin concentric orbital rings
    const ringPrimaryMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xd6ba82,
        emissive: 0xc4ad7d,
        emissiveIntensity: 0.55,
        roughness: 0.22,
        metalness: 0.85,
        transparent: true,
        opacity: 0.86,
      })
    );
    const ringMidMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa5b4a4,
        emissive: 0x3b6e5c,
        emissiveIntensity: 0.3,
        roughness: 0.35,
        metalness: 0.65,
        transparent: true,
        opacity: 0.48,
      })
    );
    const ringOuterMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc4ad7d,
        emissive: 0xc4ad7d,
        emissiveIntensity: 0.35,
        roughness: 0.28,
        metalness: 0.75,
        transparent: true,
        opacity: 0.34,
      })
    );

    const orbiterCoreMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xfff3d4,
      })
    );
    const orbiterHaloMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xc4ad7d,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const beamInnerMat = trackMat(createVolumetricBeamMaterial(0xf6eed8, 0.01));
    const beamOuterMat = trackMat(createVolumetricBeamMaterial(0x8db8a5, 0.01));

    const particleMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0xead7ab,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    const mainDiscGeo = trackGeo(new THREE.CylinderGeometry(1.12, 1.0, 0.1, 56));
    const goldTrimGeo = trackGeo(new THREE.TorusGeometry(1.1, 0.02, 14, 64));
    const lowerHubGeo = trackGeo(new THREE.ConeGeometry(0.6, 0.24, 36));
    const contactShadowGeo = trackGeo(new THREE.CircleGeometry(0.84, 32));
    const ring1Geo = trackGeo(new THREE.TorusGeometry(1.28, 0.0085, 12, 84));
    const ring2Geo = trackGeo(new THREE.TorusGeometry(1.43, 0.0055, 10, 84));
    const ring3Geo = trackGeo(new THREE.TorusGeometry(1.58, 0.0065, 10, 96));
    const orbiterCoreGeo = trackGeo(new THREE.SphereGeometry(0.036, 16, 16));
    const orbiterHaloGeo = trackGeo(new THREE.SphereGeometry(0.088, 16, 16));
    const beamInnerGeo = trackGeo(new THREE.CylinderGeometry(0.42, 1.48, 5.2, 36, 1, true));
    const beamOuterGeo = trackGeo(new THREE.CylinderGeometry(0.7, 2.1, 5.4, 36, 1, true));
    const particleGeo = trackGeo(new THREE.OctahedronGeometry(0.019, 0));

    const particleCount = 42;
    const particleSeeds = Array.from({ length: particleCount }, (_, i) => ({
      angle: (i / particleCount) * Math.PI * 2 + (i % 5) * 0.25,
      radius: 0.65 + (i % 7) * 0.26,
      yBase: 0.05 + ((i * 0.31) % 2.45),
      speed: 0.14 + (i % 4) * 0.045,
      scale: 0.55 + (i % 4) * 0.26,
      phase: i * 0.67,
    }));

    return {
      plinthMat,
      goldMat,
      darkHubMat,
      shadowMat,
      ringPrimaryMat,
      ringMidMat,
      ringOuterMat,
      orbiterCoreMat,
      orbiterHaloMat,
      beamInnerMat,
      beamOuterMat,
      particleMat,
      mainDiscGeo,
      goldTrimGeo,
      lowerHubGeo,
      contactShadowGeo,
      ring1Geo,
      ring2Geo,
      ring3Geo,
      orbiterCoreGeo,
      orbiterHaloGeo,
      beamInnerGeo,
      beamOuterGeo,
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
      stageAssets.particleSeeds.forEach((p, idx) => {
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
      stageAssets.dispose();
      lionRig.dispose();
    };
  }, [lionRig, stageAssets]);

  const animRef = useRef({
    elapsed: 0,
    blinkTimer: 1.5,
    blinkAmount: 0,
  });

  // Initial head pose gently bowed so the awakening lift looks natural
  useEffect(() => {
    lionRig.headGroup.rotation.x = reducedMotion ? -0.03 : 0.2;
    lionRig.headGroup.rotation.y = reducedMotion ? 0 : -0.14;
  }, [lionRig, reducedMotion]);

  useFrame((_, rawDelta) => {
    if (!readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      onSceneReady();
    }

    const dt = Math.min(0.08, rawDelta);
    const anim = animRef.current;
    anim.elapsed += dt;
    const elapsed = anim.elapsed;
    const exiting = exitingRef.current;

    const pointerX = pointerRef.current.x;
    const pointerY = pointerRef.current.y;

    // 1. Atmospheric Spotlight & Rim Light Emergence (darkness -> luminous halo -> soft exit)
    const awakenRamp = reducedMotion ? 1 : Math.min(1, elapsed / 1.35);
    const exitFade = exiting ? 0.32 : 1.0;

    if (keyLightRef.current) {
      const targetKey = 1.9 * awakenRamp * exitFade;
      keyLightRef.current.intensity = THREE.MathUtils.damp(
        keyLightRef.current.intensity,
        targetKey,
        3.2,
        dt
      );
    }
    if (rimLightRef.current) {
      const targetRim = 1.65 * awakenRamp * exitFade;
      rimLightRef.current.intensity = THREE.MathUtils.damp(
        rimLightRef.current.intensity,
        targetRim,
        2.8,
        dt
      );
    }
    if (ambientLightRef.current) {
      const targetAmb = 0.28 * (0.4 + 0.6 * awakenRamp) * (exiting ? 0.55 : 1);
      ambientLightRef.current.intensity = THREE.MathUtils.damp(
        ambientLightRef.current.intensity,
        targetAmb,
        3.0,
        dt
      );
    }
    if (underGlowLightRef.current) {
      const targetGlow = (0.75 + Math.sin(elapsed * 1.6) * 0.12) * awakenRamp * exitFade;
      underGlowLightRef.current.intensity = THREE.MathUtils.damp(
        underGlowLightRef.current.intensity,
        targetGlow,
        3.5,
        dt
      );
    }
    if (beamInnerRef.current && beamOuterRef.current) {
      stageAssets.beamInnerMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        stageAssets.beamInnerMat.uniforms.uOpacity.value,
        (exiting ? 0.03 : 0.16) * awakenRamp,
        3.0,
        dt
      );
      stageAssets.beamInnerMat.uniforms.uTime.value = elapsed * motionScale;
      stageAssets.beamOuterMat.uniforms.uOpacity.value = THREE.MathUtils.damp(
        stageAssets.beamOuterMat.uniforms.uOpacity.value,
        (exiting ? 0.02 : 0.1) * awakenRamp,
        3.0,
        dt
      );
      stageAssets.beamOuterMat.uniforms.uTime.value = elapsed * motionScale;
    }

    // 2. White Lion Breathing, Natural Blinking, & Awakening Head Raise
    const breath = Math.sin(elapsed * 2.0) * motionScale;
    lionRig.bodyGroup.scale.set(1 + breath * 0.013, 1 - breath * 0.012, 1 + breath * 0.013);

    const platformLift = Math.sin(elapsed * 1.35) * 0.02 * motionScale;
    if (platformGroupRef.current) {
      platformGroupRef.current.position.y = platformLift;
    }
    lionRig.lionRoot.position.y = 0.01 + platformLift;

    anim.blinkTimer -= dt;
    if (anim.blinkTimer <= 0) {
      anim.blinkTimer = 2.6 + Math.random() * 2.2;
    }
    const isBlinking = anim.blinkTimer > 2.4;
    anim.blinkAmount = THREE.MathUtils.damp(anim.blinkAmount, isBlinking ? 1 : 0, 18, dt);
    const lidAngle = THREE.MathUtils.lerp(-1.26, 0.22, anim.blinkAmount);
    lionRig.leftEyelid.rotation.x = lidAngle;
    lionRig.rightEyelid.rotation.x = lidAngle;

    // Head gradually rises to meet the viewer's gaze, then settles gently on exit
    const headAwake = reducedMotion ? 1 : THREE.MathUtils.smoothstep(elapsed, 0.15, 1.55);
    const targetHeadX = THREE.MathUtils.lerp(0.2, -0.04, headAwake) + (exiting ? 0.02 : -pointerY * 0.08 * motionScale);
    const targetHeadY = THREE.MathUtils.lerp(-0.14, pointerX * 0.15 * motionScale, headAwake);
    lionRig.headGroup.rotation.x = THREE.MathUtils.damp(lionRig.headGroup.rotation.x, targetHeadX, 4.2, dt);
    lionRig.headGroup.rotation.y = THREE.MathUtils.damp(lionRig.headGroup.rotation.y, targetHeadY, 4.2, dt);
    lionRig.headGroup.rotation.z = THREE.MathUtils.damp(
      lionRig.headGroup.rotation.z,
      exiting ? 0 : Math.sin(elapsed * 0.9) * 0.03 * motionScale,
      4,
      dt
    );

    // Subtle eyeball tracking toward viewer
    const eyeY = pointerX * 0.12 * motionScale;
    const eyeX = -pointerY * 0.08 * motionScale;
    lionRig.leftEyeBall.rotation.y = THREE.MathUtils.damp(lionRig.leftEyeBall.rotation.y, eyeY, 8, dt);
    lionRig.leftEyeBall.rotation.x = THREE.MathUtils.damp(lionRig.leftEyeBall.rotation.x, eyeX, 8, dt);
    lionRig.rightEyeBall.rotation.y = THREE.MathUtils.damp(lionRig.rightEyeBall.rotation.y, eyeY, 8, dt);
    lionRig.rightEyeBall.rotation.x = THREE.MathUtils.damp(lionRig.rightEyeBall.rotation.x, eyeX, 8, dt);

    // Calm arm & tail poise
    const armIdle = Math.sin(elapsed * 1.4) * 0.035 * motionScale;
    lionRig.leftArmGroup.rotation.z = THREE.MathUtils.damp(lionRig.leftArmGroup.rotation.z, armIdle, 6, dt);
    lionRig.rightArmGroup.rotation.z = THREE.MathUtils.damp(lionRig.rightArmGroup.rotation.z, -armIdle, 6, dt);
    lionRig.tailGroup.rotation.y = Math.sin(elapsed * 1.9) * 0.11 * motionScale;
    lionRig.emblem.rotation.y += dt * 0.55 * motionScale;

    // 3. Concentric 3D Orbital Rings & Traveling Champagne-Gold Particle
    const ringSpinScale = exiting ? 0.3 : motionScale;
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += dt * 0.42 * ringSpinScale;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= dt * 0.28 * ringSpinScale;
      ring2Ref.current.rotation.y = Math.sin(elapsed * 0.5) * 0.06 * motionScale;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z += dt * 0.18 * ringSpinScale;
    }

    if (orbiterGroupRef.current) {
      const orbitAngle = elapsed * 0.92 * motionScale;
      const orbitR = 1.28;
      orbiterGroupRef.current.position.set(
        Math.cos(orbitAngle) * orbitR,
        0.025 + Math.sin(orbitAngle) * 0.04,
        Math.sin(orbitAngle) * orbitR
      );
      if (orbiterLightRef.current) {
        orbiterLightRef.current.intensity = (0.85 + Math.sin(elapsed * 3.0) * 0.18) * awakenRamp * exitFade;
      }
    }

    // 4. Floating Volumetric Light-Beam Particles
    if (particleMeshRef.current) {
      stageAssets.particleSeeds.forEach((p, idx) => {
        const yRange = 2.55;
        const yDrift = ((p.yBase + elapsed * p.speed * motionScale) % yRange) + 0.05;
        const swirl = p.angle + elapsed * 0.12 * motionScale;
        const radial = p.radius + Math.sin(elapsed * 1.2 + p.phase) * 0.05;
        _dummyPos.set(Math.cos(swirl) * radial, yDrift, Math.sin(swirl) * radial - 0.1);
        _dummyEuler.set(elapsed * 0.5 + p.phase, elapsed * 0.35, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.setScalar(p.scale * awakenRamp);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMeshRef.current!.setMatrixAt(idx, _dummyMat);
      });
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 5. Gentle Cinematic Camera Glide & Aspect-Aware Framing (full headroom + clear lower typography band)
    const aspect = size.width / Math.max(1, size.height);
    const isPortrait = aspect < 0.85;
    const restZ = isPortrait
      ? THREE.MathUtils.clamp(5.75 / Math.max(0.42, aspect), 7.6, 13.0)
      : 7.05;
    const startZ = restZ + 0.6;
    const camEase = reducedMotion ? 1 : THREE.MathUtils.smoothstep(elapsed, 0, 2.2);
    const desiredZ = THREE.MathUtils.lerp(startZ, restZ, camEase);
    const desiredX = pointerX * 0.16 * motionScale;
    const lookY = isPortrait ? 0.42 : 0.24;
    const desiredY = (isPortrait ? 2.65 : 1.88) + pointerY * 0.08 * motionScale;

    if (elapsed <= dt * 1.5) {
      camera.position.set(desiredX, desiredY, desiredZ);
    } else {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredX, 3.2, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredY, 3.2, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredZ, 2.6, dt);
    }
    camera.lookAt(0, lookY, 0);
  });

  return (
    <>
      <fogExp2 attach="fog" args={['#0b1e19', 0.055]} />

      {/* Atmospheric Chiaroscuro Lighting */}
      <ambientLight ref={ambientLightRef} color="#1d4439" intensity={0.14} />
      <hemisphereLight args={[0xa5b4a4, 0x081511, 0.42]} position={[0, 8, 0]} />

      {/* Warm spotlight key ramping gently from darkness onto lion */}
      <directionalLight
        ref={keyLightRef}
        color={0xfff4e0}
        intensity={0.2}
        position={[2.4, 5.4, 3.8]}
        castShadow={!isSoftwareGl}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={16}
        shadow-camera-left={-2.5}
        shadow-camera-right={2.5}
        shadow-camera-top={2.5}
        shadow-camera-bottom={-2.5}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />

      {/* Champagne-gold rim light highlighting silver-white mane silhouette */}
      <directionalLight
        ref={rimLightRef}
        color={0xe8d8b5}
        intensity={0.15}
        position={[-2.8, 3.4, -3.6]}
      />

      {/* Cool forest side fill */}
      <directionalLight color={0x76a894} intensity={0.48} position={[3.6, 2.2, -1.8]} />

      {/* Gentle Volumetric Light Cones */}
      <mesh
        ref={beamInnerRef}
        geometry={stageAssets.beamInnerGeo}
        material={stageAssets.beamInnerMat}
        position={[0, 2.45, -0.05]}
      />
      <mesh
        ref={beamOuterRef}
        geometry={stageAssets.beamOuterGeo}
        material={stageAssets.beamOuterMat}
        position={[0, 2.45, -0.05]}
      />

      {/* Illuminated Circular Architectural Platform */}
      <group ref={platformGroupRef}>
        <mesh
          geometry={stageAssets.mainDiscGeo}
          material={stageAssets.plinthMat}
          position={[0, -0.05, 0]}
          receiveShadow
        />
        <mesh
          geometry={stageAssets.goldTrimGeo}
          material={stageAssets.goldMat}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
        />
        <mesh
          geometry={stageAssets.lowerHubGeo}
          material={stageAssets.darkHubMat}
          rotation={[Math.PI, 0, 0]}
          position={[0, -0.22, 0]}
        />
        <mesh
          geometry={stageAssets.contactShadowGeo}
          material={stageAssets.shadowMat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.016, 0]}
        />
        <pointLight
          ref={underGlowLightRef}
          color={0xc4ad7d}
          intensity={0.35}
          distance={3.8}
          decay={2}
          position={[0, 0.35, 0.8]}
        />
      </group>

      {/* Concentric Thin 3D Orbital Loading Rings */}
      <group position={[0, 0.02, 0]}>
        <mesh
          ref={ring1Ref}
          geometry={stageAssets.ring1Geo}
          material={stageAssets.ringPrimaryMat}
          rotation={[Math.PI / 2 - 0.04, 0.05, 0]}
        />
        <mesh
          ref={ring2Ref}
          geometry={stageAssets.ring2Geo}
          material={stageAssets.ringMidMat}
          rotation={[Math.PI / 2 + 0.08, -0.06, 0]}
        />
        <mesh
          ref={ring3Ref}
          geometry={stageAssets.ring3Geo}
          material={stageAssets.ringOuterMat}
          rotation={[Math.PI / 2 - 0.03, -0.03, 0]}
        />

        {/* Glowing Champagne-Gold Particle Moving Along Orbital Ring */}
        <group ref={orbiterGroupRef} position={[1.28, 0.025, 0]}>
          <mesh geometry={stageAssets.orbiterCoreGeo} material={stageAssets.orbiterCoreMat} />
          <mesh geometry={stageAssets.orbiterHaloGeo} material={stageAssets.orbiterHaloMat} />
          <pointLight
            ref={orbiterLightRef}
            color={0xe8d094}
            intensity={0.75}
            distance={2.4}
            decay={2}
          />
        </group>
      </group>

      {/* Subtle Floating Dust Motes */}
      <instancedMesh
        ref={particleMeshRef}
        args={[stageAssets.particleGeo, stageAssets.particleMat, stageAssets.particleSeeds.length]}
        frustumCulled={false}
      />

      {/* Existing AURION 3D White Lion Character Rig */}
      <primitive object={lionRig.sceneRoot} />
    </>
  );
};

export default LoadingLionScene;
