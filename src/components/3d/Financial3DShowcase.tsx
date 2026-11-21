import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CurrencyCode, FinancialAnalysisSummary } from '../../types/finance';
import { formatCurrency } from '../../utils/currency';
import {
  CategoryBarMetric,
  computeCategoryBarMetrics,
  computeHealthRingMetrics,
} from '../../utils/scene3dMetrics';
import {
  createContactShadowTexture,
  createPlinthSurfaceTexture,
} from '../../utils/threeStudio';
import { ThreeSceneManager } from './ThreeSceneManager';
import { useThreeScene } from './ThreeSceneContext';

interface Financial3DShowcaseProps {
  analysis: FinancialAnalysisSummary;
  currency: CurrencyCode;
  onInspectReports?: () => void;
}

const COLUMN_COLORS = [0x183b32, 0x3b6e5c, 0x5c8374, 0xc4ad7d, 0x8c7a5b, 0xa5b4a4];

const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();

interface FinancialTopologySceneProps {
  categoryBars: CategoryBarMetric[];
  healthMetrics: ReturnType<typeof computeHealthRingMetrics>;
  selectedCategory: string | null;
  onSelectMetric: (metric: CategoryBarMetric) => void;
  isSoftwareGl: boolean;
  reducedMotion: boolean;
}

const FinancialTopologyScene: React.FC<FinancialTopologySceneProps> = ({
  categoryBars,
  healthMetrics,
  selectedCategory,
  onSelectMetric,
  isSoftwareGl,
  reducedMotion,
}) => {
  const { gl } = useThree();
  const motionScale = reducedMotion ? 0.35 : 1.0;

  const coreGroupRef = useRef<THREE.Group | null>(null);
  const outerGlassRef = useRef<THREE.Mesh | null>(null);
  const progressArcRef = useRef<THREE.Mesh | null>(null);
  const coinGroupRef = useRef<THREE.Group | null>(null);
  const particleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const columnGroupRefs = useRef<Record<string, THREE.Group | null>>({});
  const columnCapMatRefs = useRef<Record<string, THREE.MeshStandardMaterial | null>>({});
  const hoveredCategoryRef = useRef<string | null>(null);
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
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: plinthTex,
        roughness: 0.38,
        metalness: 0.12,
      })
    );
    const goldMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xc4ad7d,
        roughness: 0.2,
        metalness: 0.92,
        anisotropy: 0.8,
        clearcoat: 0.25,
      })
    );
    const sageTrackMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xa5b4a4,
        roughness: 0.55,
        metalness: 0.15,
        transparent: true,
        opacity: 0.45,
      })
    );
    const glassShellMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0xe3efe8,
        roughness: 0.12,
        metalness: 0.04,
        clearcoat: 1.0,
        transparent: true,
        opacity: isSoftwareGl ? 0.34 : 0.46,
        depthWrite: false,
      })
    );
    const coreOrbMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x2f6f5e,
        emissive: 0x183b32,
        emissiveIntensity: 0.45,
        roughness: 0.22,
        metalness: 0.28,
        clearcoat: 0.5,
      })
    );
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    const particleMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xc4ad7d,
        emissive: 0xc4ad7d,
        emissiveIntensity: 0.4,
        roughness: 0.25,
        metalness: 0.7,
      })
    );

    const baseDiscGeo = trackGeo(new THREE.CylinderGeometry(1.78, 1.66, 0.12, 56));
    const baseRimGeo = trackGeo(new THREE.TorusGeometry(1.76, 0.025, 14, 64));
    const centerShadowGeo = trackGeo(new THREE.CircleGeometry(0.7, 32));
    const innerCoreGeo = trackGeo(new THREE.SphereGeometry(0.32 * healthMetrics.sphereScale, 28, 22));
    const outerGlassGeo = trackGeo(
      new THREE.IcosahedronGeometry(0.42 * healthMetrics.sphereScale, 1)
    );
    const trackRingGeo = trackGeo(new THREE.TorusGeometry(0.58, 0.022, 12, 56));
    const progressArcGeo = trackGeo(
      new THREE.TorusGeometry(0.58, 0.032, 14, 56, healthMetrics.arcAngle)
    );
    const coinBodyGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.038, 28));
    const coinRimGeo = trackGeo(new THREE.TorusGeometry(0.155, 0.01, 8, 28));
    const colSleeveGeo = trackGeo(new THREE.CylinderGeometry(0.135, 0.145, 0.05, 8));
    const colCapGeo = trackGeo(new THREE.TorusGeometry(0.115, 0.014, 10, 24));
    const particleGeo = trackGeo(new THREE.OctahedronGeometry(0.024, 0));

    const columns = categoryBars.map((metric, idx) => {
      const arcRadius = 1.24;
      const x = Math.sin(metric.angle) * arcRadius;
      const z = -Math.cos(metric.angle) * arcRadius * 0.78 - 0.1;
      const heightVal = 0.25 + metric.normalizedHeight * 1.05;
      const colorHex = COLUMN_COLORS[idx % COLUMN_COLORS.length];

      const shaftMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: colorHex,
          roughness: 0.34,
          metalness: 0.18,
          clearcoat: 0.22,
        })
      );
      const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.105, 0.12, heightVal, 8));
      const capMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0xc4ad7d,
          emissive: 0xc4ad7d,
          emissiveIntensity: 0.2,
          roughness: 0.25,
          metalness: 0.85,
        })
      );

      return { metric, x, z, heightVal, shaftMat, shaftGeo, capMat };
    });

    const coins = Array.from({ length: healthMetrics.coinCount }, (_, c) => {
      const offsetAngle = c * 0.6;
      return {
        key: c,
        position: [
          Math.cos(offsetAngle) * 0.014,
          0.02 + c * 0.044,
          Math.sin(offsetAngle) * 0.014,
        ] as [number, number, number],
      };
    });

    const particleSeeds = Array.from({ length: 24 }, (_, i) => ({
      angle: (i / 24) * Math.PI * 2,
      radius: 0.75 + (i % 4) * 0.28,
      yBase: 0.2 + ((i * 0.29) % 1.35),
      speed: 0.14 + (i % 3) * 0.05,
      scale: 0.65 + (i % 3) * 0.25,
    }));

    return {
      plinthMat,
      goldMat,
      sageTrackMat,
      glassShellMat,
      coreOrbMat,
      shadowMat,
      particleMat,
      baseDiscGeo,
      baseRimGeo,
      centerShadowGeo,
      innerCoreGeo,
      outerGlassGeo,
      trackRingGeo,
      progressArcGeo,
      coinBodyGeo,
      coinRimGeo,
      colSleeveGeo,
      colCapGeo,
      particleGeo,
      columns,
      coins,
      particleSeeds,
      dispose: () => {
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.forEach((t) => t.dispose());
      },
    };
  }, [categoryBars, healthMetrics, isSoftwareGl, maxAniso]);

  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = 'default';
      assets.dispose();
    };
  }, [assets, gl]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(0.08, rawDelta);
    elapsedRef.current += dt;
    const elapsed = elapsedRef.current;

    if (coreGroupRef.current) {
      coreGroupRef.current.position.y = 0.64 + Math.sin(elapsed * 1.8) * 0.035 * motionScale;
    }
    if (outerGlassRef.current) {
      outerGlassRef.current.rotation.y += dt * 0.35 * motionScale;
      outerGlassRef.current.rotation.x += dt * 0.18 * motionScale;
    }
    if (progressArcRef.current) {
      progressArcRef.current.rotation.z += dt * 0.25 * motionScale;
    }
    if (coinGroupRef.current) {
      coinGroupRef.current.rotation.y = Math.sin(elapsed * 0.8) * 0.15 * motionScale;
    }

    const activeCat = hoveredCategoryRef.current ?? selectedCategory;
    assets.columns.forEach(({ metric }) => {
      const grp = columnGroupRefs.current[metric.category];
      const capMat = columnCapMatRefs.current[metric.category];
      const isHot = activeCat === metric.category;
      const targetScale = isHot ? 1.08 : 1.0;
      if (grp) {
        grp.scale.x = THREE.MathUtils.damp(grp.scale.x, targetScale, 10, dt);
        grp.scale.z = THREE.MathUtils.damp(grp.scale.z, targetScale, 10, dt);
      }
      if (capMat) {
        capMat.emissiveIntensity = THREE.MathUtils.damp(
          capMat.emissiveIntensity,
          isHot ? 0.95 : 0.2,
          8,
          dt
        );
      }
    });

    if (particleMeshRef.current) {
      assets.particleSeeds.forEach((p, idx) => {
        const yVal = ((p.yBase + elapsed * p.speed * motionScale) % 1.4) + 0.15;
        const a = p.angle + elapsed * 0.22 * motionScale;
        _dummyPos.set(Math.cos(a) * p.radius, yVal, Math.sin(a) * p.radius);
        _dummyScale.setScalar(p.scale);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        particleMeshRef.current!.setMatrixAt(idx, _dummyMat);
      });
      particleMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <>
      <group>
        {/* 1. Architectural Circular Base Plinth */}
        <mesh
          geometry={assets.baseDiscGeo}
          material={assets.plinthMat}
          position={[0, -0.06, 0]}
          receiveShadow
        />
        <mesh
          geometry={assets.baseRimGeo}
          material={assets.goldMat}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
        />
        <mesh
          geometry={assets.centerShadowGeo}
          material={assets.shadowMat}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, 0]}
        />

        {/* 2. Dimensional Savings Sphere + 3D Health Progress Ring */}
        <group ref={coreGroupRef} position={[0, 0.64, 0.12]}>
          <mesh geometry={assets.innerCoreGeo} material={assets.coreOrbMat} castShadow />
          <mesh ref={outerGlassRef} geometry={assets.outerGlassGeo} material={assets.glassShellMat} />
          <mesh
            geometry={assets.trackRingGeo}
            material={assets.sageTrackMat}
            rotation={[Math.PI * 0.38, 0, 0]}
          />
          <mesh
            ref={progressArcRef}
            geometry={assets.progressArcGeo}
            material={assets.goldMat}
            rotation={[Math.PI * 0.38, 0, Math.PI * 0.5]}
          />
        </group>

        {/* 3. Metallic 3D Coin Stack */}
        <group ref={coinGroupRef} position={[-1.12, 0.01, 0.65]}>
          {assets.coins.map((c) => (
            <group key={c.key} position={c.position}>
              <mesh geometry={assets.coinBodyGeo} material={assets.goldMat} castShadow />
              <mesh
                geometry={assets.coinRimGeo}
                material={assets.goldMat}
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0.018, 0]}
              />
            </group>
          ))}
        </group>

        {/* 4. Interactive 3D Spending Category Columns */}
        {assets.columns.map(({ metric, x, z, heightVal, shaftGeo, shaftMat, capMat }) => (
          <group
            key={metric.category}
            ref={(el) => {
              columnGroupRefs.current[metric.category] = el;
            }}
            position={[x, 0.01, z]}
          >
            <mesh geometry={assets.colSleeveGeo} material={assets.goldMat} position={[0, 0.025, 0]} />
            <mesh
              geometry={shaftGeo}
              material={shaftMat}
              position={[0, 0.05 + heightVal / 2, 0]}
              castShadow
              onPointerOver={(e) => {
                e.stopPropagation();
                hoveredCategoryRef.current = metric.category;
                gl.domElement.style.cursor = 'pointer';
                onSelectMetric(metric);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                if (hoveredCategoryRef.current === metric.category) {
                  hoveredCategoryRef.current = null;
                }
                gl.domElement.style.cursor = 'default';
              }}
              onClick={(e) => {
                e.stopPropagation();
                hoveredCategoryRef.current = metric.category;
                onSelectMetric(metric);
              }}
            />
            <mesh
              geometry={assets.colCapGeo}
              material={capMat}
              ref={(mesh) => {
                columnCapMatRefs.current[metric.category] =
                  (mesh?.material as THREE.MeshStandardMaterial) ?? null;
              }}
              rotation={[Math.PI / 2, 0, 0]}
              position={[0, 0.055 + heightVal, 0]}
            />
          </group>
        ))}
      </group>

      {/* 5. Floating Financial Data Particles */}
      <instancedMesh
        ref={particleMeshRef}
        args={[assets.particleGeo, assets.particleMat, assets.particleSeeds.length]}
        frustumCulled={false}
      />
    </>
  );
};

export const Financial3DShowcase: React.FC<Financial3DShowcaseProps> = ({
  analysis,
  currency,
  onInspectReports,
}) => {
  const { isSoftwareGl, reducedMotion } = useThreeScene();

  const categoryBars = useMemo(
    () => computeCategoryBarMetrics(analysis.categoryBreakdown, 6),
    [analysis.categoryBreakdown]
  );
  const healthMetrics = useMemo(
    () =>
      computeHealthRingMetrics(
        analysis.healthScore.total,
        analysis.overview.savingsRate,
        analysis.overview.netCashFlow
      ),
    [analysis.healthScore.total, analysis.overview.savingsRate, analysis.overview.netCashFlow]
  );

  const [selectedMetric, setSelectedMetric] = useState<CategoryBarMetric | null>(
    () => categoryBars[0] ?? null
  );

  useEffect(() => {
    setSelectedMetric((prev) => {
      if (!categoryBars.length) return null;
      if (prev) {
        const match = categoryBars.find((b) => b.category === prev.category);
        if (match) return match;
      }
      return categoryBars[0];
    });
  }, [categoryBars]);

  const fallbackNode = (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="font-display font-semibold text-base text-[#183B32]">
        Health Core: {analysis.healthScore.total} / 100
      </div>
      <p className="text-xs text-[#5C635E] mt-1">
        Net Cash Flow: {formatCurrency(analysis.overview.netCashFlow, currency)}
      </p>
    </div>
  );

  return (
    <section
      data-testid="financial-3d-showcase"
      className="bg-white rounded-2xl border border-[#E5E1D8] p-5 sm:p-6 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-[#202321]">
            3D Wealth &amp; Spending Topology
          </h2>
          <p className="text-xs text-[#5C635E]">
            Interactive 3D view of your health ring ({analysis.healthScore.total}/100), savings
            reserve, and top spending columns
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-[#EBF0E9] text-[#183B32] font-mono-num font-semibold">
            {healthMetrics.coinCount}x Reserve Coins
          </span>
          {onInspectReports && (
            <button
              type="button"
              onClick={onInspectReports}
              className="px-3 py-1 rounded-lg border border-[#DFDBD0] text-[#202321] font-medium hover:border-[#183B32] transition-colors"
            >
              Full Report
            </button>
          )}
        </div>
      </div>

      <div className="relative h-[260px] sm:h-[290px] rounded-xl bg-[#F6F4EF] border border-[#EAE7DF] overflow-hidden">
        <ThreeSceneManager
          cameraPreset="financial"
          enableOrbit
          fogColor="#F6F4EF"
          shadowExtent={3.0}
          testId="financial-3d-canvas"
          ariaLabel="Interactive 3D Financial Ecosystem"
          fallback={fallbackNode}
        >
          <FinancialTopologyScene
            categoryBars={categoryBars}
            healthMetrics={healthMetrics}
            selectedCategory={selectedMetric?.category ?? null}
            onSelectMetric={setSelectedMetric}
            isSoftwareGl={isSoftwareGl}
            reducedMotion={reducedMotion}
          />
        </ThreeSceneManager>
      </div>

      {/* Clean Interactive Category Selector & Readout Bar (Zero Canvas Occlusion) */}
      {categoryBars.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryBars.map((bar) => {
              const active = selectedMetric?.category === bar.category;
              return (
                <button
                  key={bar.category}
                  type="button"
                  onClick={() => setSelectedMetric(bar)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-[#183B32] text-white border-[#183B32]'
                      : 'bg-[#FAF9F6] text-[#202321] border-[#E5E1D8] hover:border-[#183B32]'
                  }`}
                >
                  {bar.category}
                </button>
              );
            })}
          </div>

          {selectedMetric && (
            <div
              data-testid="financial-3d-readout"
              className="text-xs font-mono-num text-[#202321] bg-[#FAF9F6] border border-[#E5E1D8] rounded-lg px-3 py-1.5"
            >
              <span className="font-semibold">{selectedMetric.category}:</span>{' '}
              <span className="text-[#183B32] font-semibold">
                {formatCurrency(selectedMetric.amount, currency)}
              </span>{' '}
              <span className="text-[#5C635E]">({selectedMetric.percentage}%)</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
