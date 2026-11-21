import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let cachedSoftwareGl: boolean | null = null;

/**
 * Probes WebGL2 renderer string once to detect software WebGL (SwiftShader/llvmpipe/WARP).
 * Used strictly for rendering cost & frame pacing (never changes scene objects or layout).
 */
export function detectSoftwareWebGL(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return true;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export function isWebGLAvailable(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createStudioRenderer(
  container: HTMLElement,
  width: number,
  height: number,
  isSoftwareGl: boolean,
  ariaLabel: string
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    alpha: true,
    preserveDrawingBuffer: isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-label', ariaLabel);
  container.appendChild(renderer.domElement);
  return renderer;
}

export function applyRoomEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTex;
  roomEnv.dispose();
  pmremGenerator.dispose();
  return envTex;
}

export function addStudioLightingRig(
  scene: THREE.Scene,
  isSoftwareGl: boolean,
  shadowExtent = 2.6
) {
  const hemiLight = new THREE.HemisphereLight(0xf4f8f6, 0xd8d1c2, 0.92);
  hemiLight.position.set(0, 8, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.55);
  keyLight.position.set(3.4, 5.2, 4.4);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 16;
  keyLight.shadow.camera.left = -shadowExtent;
  keyLight.shadow.camera.right = shadowExtent;
  keyLight.shadow.camera.top = shadowExtent;
  keyLight.shadow.camera.bottom = -shadowExtent;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0xcfe4db, 0.9);
  rimLight.position.set(-3.6, 3.2, -3.4);
  scene.add(rimLight);

  return { hemiLight, keyLight, rimLight };
}

export function createFurBumpTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 5 + Math.random() * 11;
      const v = 96 + Math.floor(Math.random() * 68);
      ctx.strokeStyle = `rgb(${v},${v},${v})`;
      ctx.lineWidth = 1.05;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 3, y + len * 0.5, x + (Math.random() - 0.5) * 2.5, y + len);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createPlinthSurfaceTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size / 2;
    const cy = size / 2;
    const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, size / 2);
    grad.addColorStop(0, '#234f44');
    grad.addColorStop(0.55, '#183b32');
    grad.addColorStop(0.92, '#133028');
    grad.addColorStop(1, '#0e241e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Architectural concentric calibration hairline rings
    [0.34, 0.58, 0.78, 0.88].forEach((rFrac, i) => {
      ctx.beginPath();
      ctx.arc(cx, cy, (size / 2) * rFrac, 0, Math.PI * 2);
      ctx.strokeStyle = i === 2 ? 'rgba(196, 173, 125, 0.36)' : 'rgba(165, 180, 164, 0.16)';
      ctx.lineWidth = i === 2 ? 2.2 : 1.2;
      ctx.stroke();
    });

    // Subtle radial degree ticks on outer ring
    for (let a = 0; a < 36; a++) {
      const rad = (a / 36) * Math.PI * 2;
      const inner = (size / 2) * 0.81;
      const outer = (size / 2) * (a % 3 === 0 ? 0.86 : 0.84);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
      ctx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
      ctx.strokeStyle = a % 3 === 0 ? 'rgba(196, 173, 125, 0.45)' : 'rgba(246, 244, 239, 0.15)';
      ctx.lineWidth = a % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 6, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(16, 40, 34, 0.42)');
    grad.addColorStop(0.52, 'rgba(16, 40, 34, 0.16)');
    grad.addColorStop(1, 'rgba(16, 40, 34, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function scheduleAfterDraw(
  renderer: THREE.WebGLRenderer,
  isDisposed: () => boolean,
  onTimerId: (id: number) => void,
  cb: () => void,
  pauseMs = 80
) {
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (isDisposed()) return;
      const status = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (status === gl.UNSIGNALED) {
        onTimerId(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        onTimerId(window.setTimeout(cb, pauseMs));
      }
    };
    onTimerId(window.setTimeout(poll, 5));
  } catch {
    onTimerId(window.setTimeout(cb, pauseMs + 10));
  }
}
