import * as THREE from 'three';
import { createFurBumpTexture } from '../../utils/threeStudio';

export interface LionRigHandles {
  sceneRoot: THREE.Group;
  lionRoot: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  jawGroup: THREE.Group;
  leftEyeBall: THREE.Group;
  rightEyeBall: THREE.Group;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  leftEar: THREE.Group;
  rightEar: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  tailGroup: THREE.Group;
  emblem: THREE.Mesh;
  thinkingGroup: THREE.Group;
  dispose: () => void;
}

export function buildLionSceneRig(
  maxAnisotropy: number,
  isSoftwareGl: boolean
): LionRigHandles {
  const sceneRoot = new THREE.Group();
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

  const furBump = createFurBumpTexture(maxAnisotropy);
  textures.push(furBump);

  // Calibrated PBR Materials with pearl-like sheen and clear specular contrast
  const whiteFurMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xfcfaf5,
      roughness: 0.72,
      metalness: 0.01,
      sheen: 0.9,
      sheenRoughness: 0.46,
      sheenColor: new THREE.Color(0xffffff),
      clearcoat: 0.08,
      clearcoatRoughness: 0.65,
      bumpMap: furBump,
      bumpScale: 0.014,
    })
  );

  const creamChestMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.0,
      sheen: 0.75,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color(0xf7f2e8),
    })
  );

  const maneOuterMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9d2c7,
      roughness: 0.68,
      metalness: 0.03,
      sheen: 0.95,
      sheenRoughness: 0.44,
      sheenColor: new THREE.Color(0xf6f3ed),
      bumpMap: furBump,
      bumpScale: 0.022,
    })
  );

  const maneMidMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc5bdb1,
      roughness: 0.74,
      metalness: 0.02,
      sheen: 0.8,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0xede9e1),
      bumpMap: furBump,
      bumpScale: 0.02,
    })
  );

  const maneDeepMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb0a79a,
      roughness: 0.78,
      metalness: 0.02,
      bumpMap: furBump,
      bumpScale: 0.018,
    })
  );

  const browMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb9afa2,
      roughness: 0.72,
      metalness: 0.02,
    })
  );

  const smileLineMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x5c4236,
      roughness: 0.45,
      metalness: 0.0,
    })
  );

  const innerEarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe8b5ae,
      roughness: 0.64,
      metalness: 0.0,
    })
  );

  const noseMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc97f5d,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    })
  );

  const scleraMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.14,
      metalness: 0.02,
    })
  );

  const irisBlueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ea0cb,
      roughness: 0.18,
      metalness: 0.04,
    })
  );

  const irisAmberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8a5814,
      roughness: 0.16,
      metalness: 0.05,
    })
  );

  const pupilMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x0e1110,
    })
  );

  const corneaMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.04,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: isSoftwareGl ? 0.07 : 0.1,
      depthWrite: false,
    })
  );

  const goldAccentMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc4ad7d,
      roughness: 0.2,
      metalness: 0.9,
      anisotropy: 0.75,
      clearcoat: 0.25,
    })
  );

  const collarBandMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x183b32,
      roughness: 0.42,
      metalness: 0.2,
    })
  );

  // ==========================================================
  // SIGNATURE 3D WHITE LION CHARACTER RIG
  // ==========================================================
  const lionRoot = new THREE.Group();
  lionRoot.position.y = 0.01; // Grounded cleanly on top of EnvironmentShell plinth
  sceneRoot.add(lionRoot);

  const bodyGroup = new THREE.Group();
  lionRoot.add(bodyGroup);

  // Sculpted Torso (LatheGeometry with smooth anatomical taper)
  const torsoPts = [
    new THREE.Vector2(0.0, 0.21),
    new THREE.Vector2(0.25, 0.24),
    new THREE.Vector2(0.36, 0.46),
    new THREE.Vector2(0.34, 0.74),
    new THREE.Vector2(0.24, 0.96),
    new THREE.Vector2(0.0, 1.02),
  ];
  const torsoGeo = trackGeo(new THREE.LatheGeometry(torsoPts, 32));
  torsoGeo.computeTangents();
  const torsoMesh = new THREE.Mesh(torsoGeo, whiteFurMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyGroup.add(torsoMesh);

  // Cream Chest & Belly Tuft
  const bellyMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.27, 24, 20)),
    creamChestMat
  );
  bellyMesh.scale.set(0.92, 1.16, 0.56);
  bellyMesh.position.set(0, 0.58, 0.21);
  bodyGroup.add(bellyMesh);

  // Forest-Green & Champagne-Gold Architectural Collar + Crest Emblem
  const collarRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.245, 0.032, 14, 36)),
    collarBandMat
  );
  collarRing.rotation.x = Math.PI / 2 + 0.12;
  collarRing.position.set(0, 0.92, 0.02);
  bodyGroup.add(collarRing);

  const collarRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.246, 0.008, 10, 36)),
    goldAccentMat
  );
  collarRim.rotation.x = Math.PI / 2 + 0.12;
  collarRim.position.set(0, 0.938, 0.024);
  bodyGroup.add(collarRim);

  const emblem = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.068, 0)),
    goldAccentMat
  );
  emblem.scale.set(1, 1.15, 0.42);
  emblem.position.set(0, 0.87, 0.265);
  bodyGroup.add(emblem);

  // Seated Legs & Sculpted Rounded Paws with Toe Pads
  const legGeo = trackGeo(new THREE.CapsuleGeometry(0.115, 0.16, 8, 16));
  const pawGeo = trackGeo(new THREE.SphereGeometry(0.138, 22, 18));
  const toeGeo = trackGeo(new THREE.SphereGeometry(0.044, 12, 10));
  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(legGeo, whiteFurMat);
    leg.position.set(side * 0.185, 0.22, 0.02);
    leg.castShadow = true;
    bodyGroup.add(leg);

    const paw = new THREE.Mesh(pawGeo, creamChestMat);
    paw.scale.set(0.95, 0.62, 1.24);
    paw.position.set(side * 0.188, 0.085, 0.1);
    paw.castShadow = true;
    bodyGroup.add(paw);

    // 3 subtle toe sculptures on each foot
    [-0.055, 0, 0.055].forEach((tx, ti) => {
      const toe = new THREE.Mesh(toeGeo, whiteFurMat);
      toe.scale.set(0.9, 0.72, 1.15);
      toe.position.set(
        side * 0.188 + tx,
        0.055,
        0.22 + (ti === 1 ? 0.022 : 0)
      );
      bodyGroup.add(toe);
    });
  });

  // Articulated Arms & Hands (Left & Right)
  const armGeo = trackGeo(new THREE.CapsuleGeometry(0.082, 0.24, 8, 16));
  const handGeo = trackGeo(new THREE.SphereGeometry(0.095, 18, 16));
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.29, 0.81, 0.02);
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.29, 0.81, 0.02);

  [
    { group: leftArmGroup, side: -1 },
    { group: rightArmGroup, side: 1 },
  ].forEach(({ group, side }) => {
    const armMesh = new THREE.Mesh(armGeo, whiteFurMat);
    armMesh.position.set(side * 0.092, -0.115, 0.036);
    armMesh.rotation.set(-0.18, 0, side * 0.54);
    armMesh.castShadow = true;
    group.add(armMesh);

    const handMesh = new THREE.Mesh(handGeo, creamChestMat);
    handMesh.scale.set(0.96, 0.82, 1.08);
    handMesh.position.set(side * 0.175, -0.25, 0.072);
    group.add(handMesh);

    bodyGroup.add(group);
  });

  // Multi-segment S-Curved Tail + Layered Silver-White Tip Tuft
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.34, -0.25),
    new THREE.Vector3(0.09, 0.38, -0.49),
    new THREE.Vector3(0.28, 0.56, -0.55),
    new THREE.Vector3(0.36, 0.75, -0.44),
  ]);
  const tailGroup = new THREE.Group();
  const tailMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(tailCurve, 24, 0.042, 12, false)),
    whiteFurMat
  );
  tailGroup.add(tailMesh);

  const tuftPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.08, 0.05),
    new THREE.Vector2(0.095, 0.11),
    new THREE.Vector2(0.035, 0.18),
    new THREE.Vector2(0.0, 0.22),
  ];
  const tailTuft = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(tuftPts, 16)),
    maneOuterMat
  );
  tailTuft.position.set(0.35, 0.72, -0.44);
  tailTuft.rotation.z = -0.32;
  tailGroup.add(tailTuft);
  bodyGroup.add(tailGroup);

  // ==========================================================
  // 3. EXPRESSIVE HEAD, LAYERED SILVER-WHITE MANE & GAZE EYES
  // ==========================================================
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.37, 0.04);
  bodyGroup.add(headGroup);

  // Main Cranium
  const cranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.42, 34, 28)),
    whiteFurMat
  );
  cranium.scale.set(1.06, 0.98, 0.96);
  cranium.castShadow = true;
  headGroup.add(cranium);

  // Soft sculpted cheek puffs
  [-1, 1].forEach((side) => {
    const cheek = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.185, 22, 18)),
      whiteFurMat
    );
    cheek.scale.set(1.12, 0.86, 0.86);
    cheek.position.set(side * 0.255, -0.1, 0.22);
    headGroup.add(cheek);
  });

  // Voluminous Multi-Layered Silver-White Mane
  const maneGroup = new THREE.Group();
  maneGroup.position.set(0, 0.02, -0.06);
  headGroup.add(maneGroup);

  // Plush base mane collar ring
  const maneBackRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.42, 0.16, 18, 40)),
    maneMidMat
  );
  maneBackRing.scale.set(1.06, 1.12, 0.94);
  maneBackRing.castShadow = true;
  maneGroup.add(maneBackRing);

  // Sculpted plush rounded mane locks via LatheGeometry (soft film-style curls, not spiky)
  const lockPts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.145, 0.045),
    new THREE.Vector2(0.155, 0.11),
    new THREE.Vector2(0.105, 0.175),
    new THREE.Vector2(0.042, 0.215),
    new THREE.Vector2(0.0, 0.23),
  ];
  const lockGeo = trackGeo(new THREE.LatheGeometry(lockPts, 16));

  // Front-mid layer: 18 soft overlapping silver-pearl curls framing the face
  const frontLocks = 18;
  for (let i = 0; i < frontLocks; i++) {
    const angle = (i / frontLocks) * Math.PI * 2;
    const mat = i % 2 === 0 ? maneOuterMat : maneMidMat;
    const lock = new THREE.Mesh(lockGeo, mat);
    const radius = 0.4;
    const sc = 0.88 + (i % 3) * 0.08;
    lock.scale.set(sc * 1.05, sc * 0.96, sc * 0.82);
    lock.position.set(
      Math.cos(angle) * radius * 1.03,
      Math.sin(angle) * radius * 1.08,
      0.065 + (i % 2 === 0 ? 0.025 : -0.01)
    );
    lock.rotation.z = angle - Math.PI / 2;
    lock.rotation.x = 0.52;
    lock.castShadow = true;
    maneGroup.add(lock);
  }

  // Outer back-halo layer: 16 fuller deeper silver-taupe locks for plush volume
  const backLocks = 16;
  for (let i = 0; i < backLocks; i++) {
    const angle = ((i + 0.5) / backLocks) * Math.PI * 2;
    const mat = i % 2 === 0 ? maneMidMat : maneDeepMat;
    const lock = new THREE.Mesh(lockGeo, mat);
    const radius = 0.445;
    const sc = 0.98 + (i % 3) * 0.07;
    lock.scale.set(sc * 1.12, sc * 1.02, sc * 0.84);
    lock.position.set(
      Math.cos(angle) * radius * 1.05,
      Math.sin(angle) * radius * 1.11,
      -0.055
    );
    lock.rotation.z = angle - Math.PI / 2;
    lock.rotation.x = 0.36;
    maneGroup.add(lock);
  }

  // Soft swept forehead crown curl (3 layered locks)
  [-0.14, 0, 0.14].forEach((rotZ, idx) => {
    const tuft = new THREE.Mesh(lockGeo, idx === 1 ? maneOuterMat : maneMidMat);
    tuft.scale.set(0.74, idx === 1 ? 0.88 : 0.72, 0.7);
    tuft.position.set(rotZ * 0.42, 0.38, 0.17);
    tuft.rotation.x = 0.85;
    tuft.rotation.z = -rotZ * 1.3;
    headGroup.add(tuft);
  });

  // Poseable Rounded Ears with Blush Inner Shells
  const earOuterGeo = trackGeo(new THREE.SphereGeometry(0.135, 22, 18));
  const earInnerGeo = trackGeo(new THREE.SphereGeometry(0.088, 16, 14));
  const leftEar = new THREE.Group();
  const rightEar = new THREE.Group();
  [
    { group: leftEar, side: -1 },
    { group: rightEar, side: 1 },
  ].forEach(({ group, side }) => {
    group.position.set(side * 0.36, 0.34, 0.06);
    group.rotation.z = side * -0.35;

    const outer = new THREE.Mesh(earOuterGeo, whiteFurMat);
    outer.scale.set(1, 1.08, 0.62);
    outer.castShadow = true;
    group.add(outer);

    const inner = new THREE.Mesh(earInnerGeo, innerEarMat);
    inner.scale.set(0.95, 1.0, 0.42);
    inner.position.set(0, -0.01, 0.048);
    group.add(inner);

    headGroup.add(group);
  });

  // Expressive Eyes with True Gaze Tracking + Corneal Dome + Blinking Lids
  const leftEyeBall = new THREE.Group();
  const rightEyeBall = new THREE.Group();
  const leftEyelid = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.119, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.54)),
    whiteFurMat
  );
  const rightEyelid = leftEyelid.clone();

  const leftBrow = new THREE.Mesh(
    trackGeo(new THREE.CapsuleGeometry(0.024, 0.115, 6, 12)),
    browMat
  );
  const rightBrow = leftBrow.clone();

  [-1, 1].forEach((side) => {
    const socketGroup = new THREE.Group();
    socketGroup.position.set(side * 0.175, 0.055, 0.348);
    socketGroup.rotation.y = side * 0.13;

    const sclera = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.112, 26, 22)),
      scleraMat
    );
    sclera.scale.set(1, 1.08, 0.74);
    socketGroup.add(sclera);

    const eyeBall = side === -1 ? leftEyeBall : rightEyeBall;
    socketGroup.add(eyeBall);

    const blueRing = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.078, 26)),
      irisBlueMat
    );
    blueRing.position.z = 0.084;
    eyeBall.add(blueRing);

    const amberIris = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.062, 26)),
      irisAmberMat
    );
    amberIris.position.z = 0.086;
    eyeBall.add(amberIris);

    const pupil = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(0.04, 22)),
      pupilMat
    );
    pupil.position.z = 0.089;
    eyeBall.add(pupil);

    // Primary & secondary wet catchlights placed crisply in front of pupil
    const catchlightMain = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.017, 10, 10)),
      scleraMat
    );
    catchlightMain.position.set(0.025, 0.028, 0.094);
    eyeBall.add(catchlightMain);

    const catchlightSub = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.008, 8, 8)),
      scleraMat
    );
    catchlightSub.position.set(-0.021, -0.021, 0.094);
    eyeBall.add(catchlightSub);

    // Glossy cornea dome
    const cornea = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.114, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.45)),
      corneaMat
    );
    cornea.rotation.x = Math.PI / 2;
    cornea.scale.set(1, 0.76, 1.08);
    socketGroup.add(cornea);

    const eyelid = side === -1 ? leftEyelid : rightEyelid;
    eyelid.scale.set(1.01, 1.06, 0.78);
    eyelid.rotation.x = -1.26;
    socketGroup.add(eyelid);

    headGroup.add(socketGroup);

    const brow = side === -1 ? leftBrow : rightBrow;
    brow.position.set(side * 0.18, 0.215, 0.372);
    brow.rotation.z = Math.PI / 2 + side * -0.16;
    headGroup.add(brow);
  });

  // Snout, Muzzle Pads, Peach-Terracotta Nose & Curved Whiskers
  const muzzleGroup = new THREE.Group();
  muzzleGroup.position.set(0, -0.092, 0.382);
  headGroup.add(muzzleGroup);

  [-1, 1].forEach((side) => {
    const pad = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.118, 22, 18)),
      creamChestMat
    );
    pad.scale.set(1.06, 0.86, 0.94);
    pad.position.set(side * 0.082, 0, 0.04);
    muzzleGroup.add(pad);
  });

  const nose = new THREE.Mesh(
    trackGeo(new THREE.ConeGeometry(0.068, 0.072, 3)),
    noseMat
  );
  nose.rotation.x = Math.PI * 0.45;
  nose.rotation.z = Math.PI;
  nose.scale.set(1.26, 0.86, 0.82);
  nose.position.set(0, 0.066, 0.128);
  muzzleGroup.add(nose);

  // Articulated Lower Jaw & Warm Smile
  const jawGroup = new THREE.Group();
  jawGroup.position.set(0, -0.08, 0.02);
  muzzleGroup.add(jawGroup);

  const lowerChin = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.092, 18, 14)),
    creamChestMat
  );
  lowerChin.scale.set(1.12, 0.66, 0.96);
  lowerChin.position.set(0, -0.022, 0.032);
  jawGroup.add(lowerChin);

  const innerMouth = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.07, 14, 12)),
    innerEarMat
  );
  innerMouth.scale.set(1.0, 0.4, 0.7);
  innerMouth.position.set(0, 0.012, 0.036);
  jawGroup.add(innerMouth);

  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.088, 0.026, 0.092),
    new THREE.Vector3(0, 0.002, 0.109),
    new THREE.Vector3(0.088, 0.026, 0.092),
  ]);
  const smileMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(smileCurve, 16, 0.0085, 6, false)),
    smileLineMat
  );
  jawGroup.add(smileMesh);

  const whiskerGeo = trackGeo(new THREE.CylinderGeometry(0.003, 0.001, 0.175, 6));
  [-1, 1].forEach((side) => {
    [-0.016, 0.018].forEach((yOff, idx) => {
      const w = new THREE.Mesh(whiskerGeo, browMat);
      w.position.set(side * 0.195, yOff, 0.072);
      w.rotation.z = Math.PI / 2 + side * (idx === 0 ? -0.08 : 0.14);
      w.rotation.y = side * -0.25;
      muzzleGroup.add(w);
    });
  });

  // Floating Contemplation / Thinking Crystal Orbit
  const thinkingGroup = new THREE.Group();
  thinkingGroup.position.set(0.56, 1.88, 0.12);
  thinkingGroup.visible = false;
  const thinkGemGeo = trackGeo(new THREE.OctahedronGeometry(0.048, 0));
  for (let i = 0; i < 3; i++) {
    const gem = new THREE.Mesh(thinkGemGeo, goldAccentMat);
    const a = (i / 3) * Math.PI * 2;
    gem.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.05, Math.sin(a) * 0.11);
    gem.scale.setScalar(i === 0 ? 1.0 : 0.65);
    thinkingGroup.add(gem);
  }
  lionRoot.add(thinkingGroup);

  return {
    sceneRoot,
    lionRoot,
    bodyGroup,
    headGroup,
    jawGroup,
    leftEyeBall,
    rightEyeBall,
    leftEyelid,
    rightEyelid,
    leftBrow,
    rightBrow,
    leftEar,
    rightEar,
    leftArmGroup,
    rightArmGroup,
    tailGroup,
    emblem,
    thinkingGroup,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
