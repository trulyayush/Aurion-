import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LionState } from '../types/finance';

interface LionAvatar3DProps {
  state: LionState;
  speechPulse?: number; // 0..1 amplitude while speaking
  onInteract?: () => void;
  className?: string;
  compact?: boolean;
}

// Pre-allocated scratch math helpers to avoid per-frame GC
const _targetRot = new THREE.Vector2(0, 0);
const _haloColorTarget = new THREE.Color();

const STATE_HALO_COLORS: Record<LionState, number> = {
  idle: 0xc4ad7d, // Champagne gold
  listening: 0x3b8c6e, // Deep emerald-sage
  thinking: 0xd9a441, // Warm amber gold
  speaking: 0x183b32, // Deep forest highlight
};

function createFurBumpTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 650; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 4 + Math.random() * 8;
      const v = 105 + Math.floor(Math.random() * 55);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 2, y + len);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(24, 59, 50, 0.34)');
    grad.addColorStop(0.55, 'rgba(24, 59, 50, 0.14)');
    grad.addColorStop(1, 'rgba(24, 59, 50, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const LionAvatar3D: React.FC<LionAvatar3DProps> = ({
  state,
  speechPulse = 0,
  onInteract,
  className = '',
  compact = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<LionState>(state);
  const pulseRef = useRef<number>(speechPulse);
  const interactCbRef = useRef(onInteract);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    pulseRef.current = speechPulse;
  }, [speechPulse]);

  useEffect(() => {
    interactCbRef.current = onInteract;
  }, [onInteract]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Software WebGL probe
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(container.clientWidth, 260);
    const height = Math.max(container.clientHeight, 260);

    const scene = new THREE.Scene();
    scene.background = null; // Transparent over clean studio backdrop

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 40);
    camera.position.set(0, compact ? 1.25 : 1.32, compact ? 4.35 : 4.15);
    camera.lookAt(0, 1.05, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D AURION white lion assistant');

    container.appendChild(renderer.domElement);

    // Studio environment map for subtle PBR highlights on eyes & gold collar
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xf2f7f5, 0xd8d2c5, 0.95);
    hemiLight.position.set(0, 8, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.55);
    keyLight.position.set(3.2, 4.8, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.camera.left = -2.5;
    keyLight.shadow.camera.right = 2.5;
    keyLight.shadow.camera.top = 2.5;
    keyLight.shadow.camera.bottom = -2.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xd7e7e0, 0.85);
    rimLight.position.set(-3.4, 3.0, -3.0);
    scene.add(rimLight);

    // Track disposables
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];

    const furBump = createFurBumpTexture();
    const shadowTex = createContactShadowTexture();
    textures.push(furBump, shadowTex);

    // Materials with calibrated roughness/metalness contrast
    const whiteFurMat = new THREE.MeshStandardMaterial({
      color: 0xfbf8f3,
      roughness: 0.78,
      metalness: 0.02,
      bumpMap: furBump,
      bumpScale: 0.014,
    });
    const creamBellyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.0,
    });
    const maneMat = new THREE.MeshStandardMaterial({
      color: 0xc2b6a8,
      roughness: 0.76,
      metalness: 0.03,
      bumpMap: furBump,
      bumpScale: 0.022,
    });
    const browMat = new THREE.MeshStandardMaterial({
      color: 0xb0a395,
      roughness: 0.74,
      metalness: 0.02,
    });
    const smileLineMat = new THREE.MeshStandardMaterial({
      color: 0x5c4236,
      roughness: 0.5,
      metalness: 0.0,
    });
    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xe6b5ae,
      roughness: 0.65,
      metalness: 0.0,
    });
    const noseMat = new THREE.MeshStandardMaterial({
      color: 0xc57d5a,
      roughness: 0.42,
      metalness: 0.05,
    });
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.02,
    });
    const irisBlueMat = new THREE.MeshStandardMaterial({
      color: 0x6f9ec4,
      roughness: 0.18,
      metalness: 0.05,
    });
    const irisAmberMat = new THREE.MeshStandardMaterial({
      color: 0x7c5416,
      roughness: 0.15,
      metalness: 0.08,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x161817,
      roughness: 0.08,
      metalness: 0.1,
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xc4ad7d,
      roughness: 0.24,
      metalness: 0.85,
    });
    const collarBandMat = new THREE.MeshStandardMaterial({
      color: 0x183b32,
      roughness: 0.45,
      metalness: 0.18,
    });
    const haloMat = new THREE.MeshStandardMaterial({
      color: 0xc4ad7d,
      emissive: 0xc4ad7d,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.65,
      transparent: true,
      opacity: 0.72,
    });

    materials.push(
      whiteFurMat,
      creamBellyMat,
      maneMat,
      browMat,
      smileLineMat,
      innerEarMat,
      noseMat,
      scleraMat,
      irisBlueMat,
      irisAmberMat,
      pupilMat,
      goldAccentMat,
      collarBandMat,
      haloMat
    );

    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };

    // Root Lion Group pivoted at bottom-center (y = 0)
    const lionRoot = new THREE.Group();
    scene.add(lionRoot);

    // Contact shadow disc flush with floor
    const contactShadow = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.85, 32)),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    materials.push(contactShadow.material as THREE.Material);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.006;
    lionRoot.add(contactShadow);

    // Subtle futuristic ground status ring
    const statusRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.68, 0.73, 48)),
      haloMat
    );
    statusRing.rotation.x = -Math.PI / 2;
    statusRing.position.y = 0.014;
    lionRoot.add(statusRing);

    // Character body group (animates breathing & bounce)
    const bodyGroup = new THREE.Group();
    lionRoot.add(bodyGroup);

    // 1. Torso (LatheGeometry for organic sculpted silhouette)
    const torsoPts = [
      new THREE.Vector2(0.0, 0.22),
      new THREE.Vector2(0.26, 0.26),
      new THREE.Vector2(0.36, 0.48),
      new THREE.Vector2(0.33, 0.76),
      new THREE.Vector2(0.24, 0.96),
      new THREE.Vector2(0.0, 1.0),
    ];
    const torsoMesh = new THREE.Mesh(
      trackGeo(new THREE.LatheGeometry(torsoPts, 28)),
      whiteFurMat
    );
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    bodyGroup.add(torsoMesh);

    // 2. Cream Belly Patch
    const bellyMesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.27, 24, 20)),
      creamBellyMat
    );
    bellyMesh.scale.set(0.92, 1.15, 0.55);
    bellyMesh.position.set(0, 0.57, 0.21);
    bodyGroup.add(bellyMesh);

    // 3. Sleek Forest-Green & Champagne-Gold Collar Medallion
    const collarRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.24, 0.032, 12, 32)),
      collarBandMat
    );
    collarRing.rotation.x = Math.PI / 2 + 0.12;
    collarRing.position.set(0, 0.91, 0.02);
    bodyGroup.add(collarRing);

    const emblem = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.065, 1)),
      goldAccentMat
    );
    emblem.scale.set(1, 1, 0.45);
    emblem.position.set(0, 0.87, 0.26);
    bodyGroup.add(emblem);

    // 4. Legs & Rounded Paws (left & right)
    const legGeo = trackGeo(new THREE.CapsuleGeometry(0.115, 0.16, 8, 16));
    const pawGeo = trackGeo(new THREE.SphereGeometry(0.135, 20, 16));
    [-1, 1].forEach((side) => {
      const leg = new THREE.Mesh(legGeo, whiteFurMat);
      leg.position.set(side * 0.18, 0.22, 0.02);
      leg.castShadow = true;
      bodyGroup.add(leg);

      const paw = new THREE.Mesh(pawGeo, creamBellyMat);
      paw.scale.set(0.95, 0.62, 1.25);
      paw.position.set(side * 0.185, 0.085, 0.09);
      paw.castShadow = true;
      bodyGroup.add(paw);
    });

    // 5. Articulated Arms & Hands
    const armGeo = trackGeo(new THREE.CapsuleGeometry(0.082, 0.26, 8, 16));
    const handGeo = trackGeo(new THREE.SphereGeometry(0.095, 16, 14));
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.31, 0.82, 0.02);
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.31, 0.82, 0.02);

    [
      { group: leftArmGroup, side: -1 },
      { group: rightArmGroup, side: 1 },
    ].forEach(({ group, side }) => {
      const armMesh = new THREE.Mesh(armGeo, whiteFurMat);
      armMesh.position.set(side * 0.12, -0.14, 0.04);
      armMesh.rotation.z = side * -0.52;
      armMesh.rotation.x = -0.18;
      armMesh.castShadow = true;
      group.add(armMesh);

      const handMesh = new THREE.Mesh(handGeo, creamBellyMat);
      handMesh.scale.set(0.95, 0.8, 1.05);
      handMesh.position.set(side * 0.23, -0.28, 0.1);
      group.add(handMesh);

      bodyGroup.add(group);
    });

    // 6. Curved Tail + Silver-Taupe Tuft
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.34, -0.26),
      new THREE.Vector3(0.08, 0.38, -0.48),
      new THREE.Vector3(0.26, 0.56, -0.54),
      new THREE.Vector3(0.34, 0.72, -0.45),
    ]);
    const tailGroup = new THREE.Group();
    const tailMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(tailCurve, 20, 0.042, 10, false)),
      whiteFurMat
    );
    tailGroup.add(tailMesh);
    const tailTuft = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.085, 0.17, 12)),
      maneMat
    );
    tailTuft.position.set(0.35, 0.76, -0.43);
    tailTuft.rotation.z = -0.35;
    tailGroup.add(tailTuft);
    bodyGroup.add(tailGroup);

    // 7. Head Group (rotates toward pointer / tilts when listening & thinking)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.36, 0.04);
    bodyGroup.add(headGroup);

    // Main Cranium (slightly wide adorable proportions matching image_a36b9c20)
    const cranium = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.42, 32, 26)),
      whiteFurMat
    );
    cranium.scale.set(1.06, 0.98, 0.96);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Cheek puffs
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.18, 20, 16)),
        whiteFurMat
      );
      cheek.scale.set(1.1, 0.85, 0.85);
      cheek.position.set(side * 0.25, -0.1, 0.22);
      headGroup.add(cheek);
    });

    // 8. Sculpted Silver-Taupe Mane Petals Collar + Crown
    const maneGroup = new THREE.Group();
    maneGroup.position.set(0, 0.02, -0.05);
    headGroup.add(maneGroup);

    const maneBackRing = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.45, 0.15, 16, 36)),
      maneMat
    );
    maneBackRing.scale.set(1.06, 1.12, 0.92);
    maneBackRing.castShadow = true;
    maneGroup.add(maneBackRing);

    const petalGeo = trackGeo(new THREE.ConeGeometry(0.145, 0.28, 7));
    const petalCount = 16;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeo, maneMat);
      const radius = 0.49;
      petal.position.set(
        Math.cos(angle) * radius * 1.04,
        Math.sin(angle) * radius * 1.1,
        0.04 + (i % 2 === 0 ? 0.03 : -0.02)
      );
      petal.rotation.z = angle - Math.PI / 2;
      petal.rotation.x = 0.22;
      maneGroup.add(petal);
    }

    // Soft forehead mane tuft
    const crownTuft = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.13, 0.22, 8)),
      maneMat
    );
    crownTuft.position.set(0, 0.44, 0.16);
    crownTuft.rotation.x = 0.55;
    headGroup.add(crownTuft);

    // 9. Rounded Ears with Blush-Pink Inner Shells
    const earOuterGeo = trackGeo(new THREE.SphereGeometry(0.135, 20, 16));
    const earInnerGeo = trackGeo(new THREE.SphereGeometry(0.088, 16, 14));
    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.36, 0.34, 0.05);
      earGroup.rotation.z = side * -0.35;

      const outer = new THREE.Mesh(earOuterGeo, whiteFurMat);
      outer.scale.set(1, 1.08, 0.6);
      earGroup.add(outer);

      const inner = new THREE.Mesh(earInnerGeo, innerEarMat);
      inner.scale.set(0.95, 1.0, 0.4);
      inner.position.set(0, -0.01, 0.045);
      earGroup.add(inner);

      headGroup.add(earGroup);
    });

    // 10. Expressive Multi-Layer Eyes + Blinking Eyelids + Eyebrows
    const leftEyelid = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.118, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.52)),
      whiteFurMat
    );
    const rightEyelid = leftEyelid.clone();

    const leftBrow = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.024, 0.11, 6, 10)),
      browMat
    );
    const rightBrow = leftBrow.clone();

    [-1, 1].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.175, 0.055, 0.35);
      eyeGroup.rotation.y = side * 0.14;

      const sclera = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.112, 24, 20)),
        scleraMat
      );
      sclera.scale.set(1, 1.08, 0.72);
      eyeGroup.add(sclera);

      const blueRing = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(0.078, 24)),
        irisBlueMat
      );
      blueRing.position.z = 0.081;
      eyeGroup.add(blueRing);

      const amberIris = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(0.062, 24)),
        irisAmberMat
      );
      amberIris.position.z = 0.083;
      eyeGroup.add(amberIris);

      const pupil = new THREE.Mesh(
        trackGeo(new THREE.CircleGeometry(0.036, 20)),
        pupilMat
      );
      pupil.position.z = 0.085;
      eyeGroup.add(pupil);

      const catchlight = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.016, 10, 10)),
        scleraMat
      );
      catchlight.position.set(0.026, 0.028, 0.086);
      eyeGroup.add(catchlight);

      const eyelid = side === -1 ? leftEyelid : rightEyelid;
      eyelid.scale.set(1, 1.05, 0.78);
      eyelid.rotation.x = -0.95; // open by default
      eyeGroup.add(eyelid);

      headGroup.add(eyeGroup);

      const brow = side === -1 ? leftBrow : rightBrow;
      brow.position.set(side * 0.18, 0.21, 0.37);
      brow.rotation.z = Math.PI / 2 + side * -0.16;
      headGroup.add(brow);
    });

    // 11. Snout, Muzzle & Peach-Brown Nose
    const muzzleGroup = new THREE.Group();
    muzzleGroup.position.set(0, -0.09, 0.38);
    headGroup.add(muzzleGroup);

    [-1, 1].forEach((side) => {
      const pad = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.115, 20, 16)),
        creamBellyMat
      );
      pad.scale.set(1.05, 0.86, 0.92);
      pad.position.set(side * 0.08, 0, 0.04);
      muzzleGroup.add(pad);
    });

    const nose = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.068, 0.07, 3)),
      noseMat
    );
    nose.rotation.x = Math.PI * 0.45;
    nose.rotation.z = Math.PI;
    nose.scale.set(1.25, 0.85, 0.8);
    nose.position.set(0, 0.065, 0.125);
    muzzleGroup.add(nose);

    // 12. Articulated Lower Jaw & Smile (animates during speaking)
    const jawGroup = new THREE.Group();
    jawGroup.position.set(0, -0.08, 0.02);
    muzzleGroup.add(jawGroup);

    const lowerChin = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.09, 16, 14)),
      creamBellyMat
    );
    lowerChin.scale.set(1.1, 0.65, 0.95);
    lowerChin.position.set(0, -0.02, 0.03);
    jawGroup.add(lowerChin);

    const innerMouth = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.07, 14, 12)),
      innerEarMat
    );
    innerMouth.scale.set(1.0, 0.4, 0.7);
    innerMouth.position.set(0, 0.012, 0.035);
    jawGroup.add(innerMouth);

    // Subtle sculpted smile curve + delicate cheek whiskers
    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.085, 0.024, 0.092),
      new THREE.Vector3(0, 0.002, 0.108),
      new THREE.Vector3(0.085, 0.024, 0.092),
    ]);
    const smileMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(smileCurve, 14, 0.0085, 6, false)),
      smileLineMat
    );
    jawGroup.add(smileMesh);

    const whiskerGeo = trackGeo(new THREE.CylinderGeometry(0.003, 0.001, 0.17, 6));
    [-1, 1].forEach((side) => {
      [-0.015, 0.018].forEach((yOff, idx) => {
        const w = new THREE.Mesh(whiskerGeo, browMat);
        w.position.set(side * 0.19, yOff, 0.07);
        w.rotation.z = Math.PI / 2 + side * (idx === 0 ? -0.08 : 0.14);
        w.rotation.y = side * -0.25;
        muzzleGroup.add(w);
      });
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Pointer hover + click interaction
    let pointerX = 0;
    let pointerY = 0;
    let clickBounce = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handlePointerDown = () => {
      clickBounce = 1.0;
      interactCbRef.current?.();
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    const handleResize = () => {
      if (!container) return;
      const w = Math.max(container.clientWidth, 240);
      const h = Math.max(container.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop with software WebGL afterDraw pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let blinkTimer = 2.6;
    let blinkAmount = 0;

    function afterDraw(cb: () => void) {
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (status === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 90);
      }
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      const currentState = stateRef.current;

      // Natural blinking
      blinkTimer -= dt;
      if (blinkTimer <= 0) {
        blinkTimer = 2.8 + Math.random() * 2.4;
      }
      const isBlinking = blinkTimer > 2.55;
      blinkAmount = THREE.MathUtils.damp(blinkAmount, isBlinking ? 1 : 0, 18, dt);
      const lidAngle = THREE.MathUtils.lerp(-0.98, 0.15, blinkAmount);
      leftEyelid.rotation.x = lidAngle;
      rightEyelid.rotation.x = lidAngle;

      // Breathing & body bounce
      const breath = Math.sin(elapsed * 2.1);
      bodyGroup.scale.set(1 + breath * 0.012, 1 - breath * 0.012, 1 + breath * 0.012);

      // Click bounce decay
      clickBounce = THREE.MathUtils.damp(clickBounce, 0, 6, dt);
      bodyGroup.position.y = clickBounce * 0.09 + (currentState === 'speaking' ? Math.abs(Math.sin(elapsed * 7)) * 0.018 : 0);

      // Head orientation & expression by interaction state
      let targetHeadY = pointerX * 0.24;
      let targetHeadX = -pointerY * 0.14;
      let targetHeadZ = 0;

      if (currentState === 'listening') {
        targetHeadZ = 0.12;
        targetHeadX = -0.06;
        targetHeadY = pointerX * 0.12;
      } else if (currentState === 'thinking') {
        targetHeadY = Math.sin(elapsed * 1.4) * 0.16;
        targetHeadX = -0.14;
        targetHeadZ = -0.09;
      } else if (currentState === 'speaking') {
        targetHeadY = Math.sin(elapsed * 2.3) * 0.09 + pointerX * 0.1;
        targetHeadX = Math.sin(elapsed * 4.2) * 0.04;
      }

      _targetRot.set(targetHeadX, targetHeadY);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, _targetRot.x, 7, dt);
      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, _targetRot.y, 7, dt);
      headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, targetHeadZ, 6, dt);

      // Jaw speaking animation
      const jawTarget =
        currentState === 'speaking'
          ? 0.04 + (pulseRef.current > 0 ? pulseRef.current * 0.22 : (Math.sin(elapsed * 13) * 0.5 + 0.5) * 0.18)
          : 0;
      jawGroup.rotation.x = THREE.MathUtils.damp(jawGroup.rotation.x, jawTarget, 18, dt);

      // Arms gesture
      const rightWave =
        clickBounce > 0.15
          ? -1.15 + Math.sin(elapsed * 14) * 0.25
          : currentState === 'speaking'
          ? -0.22 + Math.sin(elapsed * 4.5) * 0.14
          : currentState === 'thinking'
          ? -0.45
          : Math.sin(elapsed * 1.6) * 0.05;
      const leftGesture =
        currentState === 'speaking'
          ? 0.18 + Math.cos(elapsed * 4.0) * 0.1
          : Math.sin(elapsed * 1.6 + 1) * 0.04;

      rightArmGroup.rotation.z = THREE.MathUtils.damp(rightArmGroup.rotation.z, -rightWave, 8, dt);
      leftArmGroup.rotation.z = THREE.MathUtils.damp(leftArmGroup.rotation.z, leftGesture, 8, dt);

      // Gentle tail wag
      tailGroup.rotation.y = Math.sin(elapsed * (currentState === 'listening' ? 4.5 : 2.2)) * 0.14;

      // Halo ring state color & subtle rotation
      _haloColorTarget.setHex(STATE_HALO_COLORS[currentState]);
      haloMat.color.lerp(_haloColorTarget, Math.min(1, dt * 5));
      haloMat.emissive.lerp(_haloColorTarget, Math.min(1, dt * 5));
      haloMat.emissiveIntensity = currentState === 'idle' ? 0.18 : 0.48;
      emblem.rotation.y += dt * (currentState === 'thinking' ? 2.4 : 0.6);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
    };
  }, [compact]);

  return (
    <div
      ref={mountRef}
      data-testid="lion-canvas"
      data-lion-state={state}
      title="Click AURION to interact"
      className={`relative w-full h-full cursor-pointer select-none ${className}`}
    />
  );
};
