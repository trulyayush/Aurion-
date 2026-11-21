import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CurrencyCode, FinancialGoal } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import { computeGoalRingMetrics, GoalModelKind } from '../../utils/scene3dMetrics';
import {
  createContactShadowTexture,
  createPlinthSurfaceTexture,
} from '../../utils/threeStudio';
import { ThreeSceneManager } from './ThreeSceneManager';
import { useThreeScene } from './ThreeSceneContext';

interface GoalObject3DProps {
  goal: FinancialGoal;
  currency: CurrencyCode;
}

function buildGoalSculpture(
  kind: GoalModelKind,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
  mats: {
    forest: THREE.Material;
    ivory: THREE.Material;
    gold: THREE.Material;
    sage: THREE.Material;
    glass: THREE.Material;
  }
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'house') {
    const foundation = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.95, 0.08, 0.78)), mats.sage);
    foundation.position.y = 0.04;
    group.add(foundation);

    const mainWing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.84, 0.44, 0.64)), mats.ivory);
    mainWing.position.y = 0.3;
    mainWing.castShadow = true;
    group.add(mainWing);

    const roof = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.68, 0.34, 4)), mats.forest);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 0.69;
    roof.castShadow = true;
    group.add(roof);

    const doorFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.26, 0.05)), mats.gold);
    doorFrame.position.set(-0.14, 0.21, 0.32);
    group.add(doorFrame);

    const windowGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.18, 0.04)), mats.glass);
    windowGlass.position.set(0.18, 0.32, 0.32);
    group.add(windowGlass);
  } else if (kind === 'vehicle') {
    const chassis = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.12, 0.22, 0.54)), mats.forest);
    chassis.position.y = 0.21;
    chassis.castShadow = true;
    group.add(chassis);

    const hoodSlope = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.38, 0.14, 0.5)), mats.forest);
    hoodSlope.position.set(0.35, 0.27, 0);
    hoodSlope.rotation.z = -0.18;
    group.add(hoodSlope);

    const cabin = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.28, 0.56, 16)), mats.glass);
    cabin.rotation.z = Math.PI / 2;
    cabin.scale.set(0.75, 1, 1.35);
    cabin.position.set(-0.04, 0.39, 0);
    group.add(cabin);

    const tireGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 20));
    const hubGeo = trackGeo(new THREE.CylinderGeometry(0.075, 0.075, 0.096, 16));
    [
      [-0.36, 0.27],
      [0.36, 0.27],
      [-0.36, -0.27],
      [0.36, -0.27],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(tireGeo, mats.sage);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(wx, 0.13, wz);
      group.add(tire);

      const hub = new THREE.Mesh(hubGeo, mats.gold);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.13, wz);
      group.add(hub);
    });

    const lightBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.04, 0.04, 0.44)), mats.gold);
    lightBar.position.set(0.56, 0.23, 0);
    group.add(lightBar);
  } else if (kind === 'travel') {
    const stand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.26, 0.14, 24)), mats.gold);
    stand.position.y = 0.07;
    group.add(stand);

    const globe = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.38, 28, 22)), mats.forest);
    globe.position.y = 0.58;
    globe.castShadow = true;
    group.add(globe);

    const meridian = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.44, 0.018, 10, 48)), mats.gold);
    meridian.position.y = 0.58;
    meridian.rotation.y = 0.4;
    group.add(meridian);

    const flightPath = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.54, 0.01, 8, 48)), mats.sage);
    flightPath.position.y = 0.58;
    flightPath.rotation.set(1.15, 0.3, 0.2);
    group.add(flightPath);

    const planeBody = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.045, 0.16, 8)), mats.ivory);
    planeBody.position.set(0.42, 0.78, 0.32);
    planeBody.rotation.z = -1.2;
    group.add(planeBody);
  } else {
    const vaultBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.74, 0.72, 0.62)), mats.forest);
    vaultBody.position.y = 0.36;
    vaultBody.castShadow = true;
    group.add(vaultBody);

    const goldDoor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.56, 0.54, 0.04)), mats.ivory);
    goldDoor.position.set(0, 0.36, 0.31);
    group.add(goldDoor);

    const dialWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.14, 0.022, 10, 28)), mats.gold);
    dialWheel.position.set(0, 0.36, 0.35);
    group.add(dialWheel);

    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16)), mats.gold);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(0, 0.36, 0.35);
    group.add(hub);

    const roofTrim = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.78, 0.05, 0.66)), mats.gold);
    roofTrim.position.y = 0.73;
    group.add(roofTrim);
  }

  return group;
}

const GoalSculptureScene: React.FC<{
  metrics: ReturnType<typeof computeGoalRingMetrics>;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}> = ({ metrics, isSoftwareGl, reducedMotion }) => {
  const { gl } = useThree();
  const motionScale = reducedMotion ? 0.35 : 1.0;
  const elapsedRef = useRef(0);
  const maxAniso = useMemo(() => gl.capabilities.getMaxAnisotropy(), [gl]);

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

    const plinthTex = createPlinthSurfaceTexture(maxAniso);
    const shadowTex = createContactShadowTexture();
    textures.push(plinthTex, shadowTex);

    const plinthMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xffffff, map: plinthTex, roughness: 0.36, metalness: 0.14 })
    );
    const forestMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x183b32, roughness: 0.42, metalness: 0.16 })
    );
    const ivoryMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0xf6f4ef, roughness: 0.55, metalness: 0.04 })
    );
    const goldMat = trackMat(
      new THREE.MeshPhysicalMaterial({ color: 0xc4ad7d, roughness: 0.2, metalness: 0.9, clearcoat: 0.25 })
    );
    const sageMat = trackMat(
      new THREE.MeshStandardMaterial({ color: 0x8ea18e, roughness: 0.5, metalness: 0.12 })
    );
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbece4,
        roughness: 0.12,
        metalness: 0.05,
        transparent: true,
        opacity: isSoftwareGl ? 0.42 : 0.54,
      })
    );
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    const baseTrackMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa5b4a4,
        roughness: 0.5,
        transparent: true,
        opacity: 0.4,
      })
    );

    const plinthGeo = trackGeo(new THREE.CylinderGeometry(1.02, 0.92, 0.1, 44));
    const shadowGeo = trackGeo(new THREE.CircleGeometry(0.68, 28));
    const baseTrackGeo = trackGeo(new THREE.TorusGeometry(0.96, 0.02, 10, 56));
    const progressRingGeo = trackGeo(
      new THREE.TorusGeometry(0.96, 0.032, 12, 56, metrics.arcAngle)
    );

    const sculpture = buildGoalSculpture(metrics.modelKind, trackGeo, {
      forest: forestMat,
      ivory: ivoryMat,
      gold: goldMat,
      sage: sageMat,
      glass: glassMat,
    });
    sculpture.position.y = 0.012;

    return {
      plinthGeo,
      plinthMat,
      shadowGeo,
      shadowMat,
      baseTrackGeo,
      baseTrackMat,
      progressRingGeo,
      goldMat,
      sculpture,
      dispose: () => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
      },
    };
  }, [isSoftwareGl, maxAniso, metrics.arcAngle, metrics.modelKind]);

  useEffect(() => {
    return () => {
      assets.dispose();
    };
  }, [assets]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(0.08, rawDelta);
    elapsedRef.current += dt;

    assets.sculpture.rotation.y += dt * (metrics.isAchieved ? 0.75 : 0.42) * motionScale;
    if (metrics.isAchieved) {
      assets.sculpture.position.y =
        0.02 + Math.abs(Math.sin(elapsedRef.current * 2.6)) * 0.05 * motionScale;
    }
  });

  return (
    <group>
      <mesh
        geometry={assets.plinthGeo}
        material={assets.plinthMat}
        position={[0, -0.05, 0]}
        receiveShadow
      />
      <mesh
        geometry={assets.shadowGeo}
        material={assets.shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.012, 0]}
      />
      <mesh
        geometry={assets.baseTrackGeo}
        material={assets.baseTrackMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
      />
      <mesh
        geometry={assets.progressRingGeo}
        material={assets.goldMat}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0.025, 0]}
      />
      <primitive object={assets.sculpture} />
    </group>
  );
};

export const GoalObject3D: React.FC<GoalObject3DProps> = ({ goal, currency }) => {
  const { isSoftwareGl, reducedMotion } = useThreeScene();
  const metrics = useMemo(() => computeGoalRingMetrics(goal), [goal]);
  const pct = Math.round(metrics.progressRatio * 100);

  const fallbackNode = (
    <div className="h-full flex flex-col items-center justify-center p-4 text-center text-xs text-[#5C635E]">
      <div className="font-semibold text-[#202321]">{goal.title}</div>
      <div className="font-mono-num mt-1">
        {formatCurrency(goal.currentSavings, currency)} /{' '}
        {formatCurrency(goal.targetAmount, currency)}
      </div>
    </div>
  );

  return (
    <div
      data-testid="goal-3d-showcase"
      className="bg-[#EBF0E9] rounded-2xl border border-[#DCE2DA] p-4 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#183B32]">
            3D Goal Visualization · {goal.category}
          </div>
          <div className="font-display text-sm font-semibold text-[#202321]">{goal.title}</div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DCE2DA] font-mono-num text-xs font-semibold text-[#183B32]">
          {pct}% funded
        </span>
      </div>

      <div className="h-[195px] rounded-xl bg-[#F6F4EF] border border-[#DCE2DA] overflow-hidden">
        <ThreeSceneManager
          cameraPreset="goal"
          enableOrbit
          fogColor="#F6F4EF"
          shadowExtent={2.2}
          testId="goal-3d-canvas"
          ariaLabel={`3D visualization for ${goal.title}`}
          fallback={fallbackNode}
        >
          <GoalSculptureScene
            metrics={metrics}
            isSoftwareGl={isSoftwareGl}
            reducedMotion={reducedMotion}
          />
        </ThreeSceneManager>
      </div>

      <div className="flex items-center justify-between text-xs text-[#5C635E]">
        <span>
          {metrics.isAchieved
            ? 'Goal milestone reached!'
            : `${formatCurrency(Math.max(0, goal.targetAmount - goal.currentSavings), currency)} remaining`}
        </span>
        <span className="font-mono-num font-medium text-[#202321]">
          Target {formatCurrency(goal.targetAmount, currency)}
        </span>
      </div>
    </div>
  );
};
