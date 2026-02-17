import React, { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";
import { resolveOrionLoginRuntimeConfig } from "./orionLoginConfig";

type OrionCityBackgroundProps = {
  enabled: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: () => void;
  onProgress?: (progress: number) => void;
};

type BuildingSpec = {
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  dimensions: { x: number; y: number; z: number };
};

type BuildingAsset = {
  name: string;
  geometry: ThreeTypes.BufferGeometry;
  originalMaterial?: ThreeTypes.Material;
};

const BUILDING_USE_SET2 = new Set(["building1.glb", "building2.glb", "building5.glb"]);
const BUILDING_USE_ORIGINAL = new Set<string>();

const CUSTOM_BUILDING_SPECS: BuildingSpec[] = [
  {
    name: "building4.glb",
    position: { x: -46.424, y: 199.84, z: -180 },
    rotation: { x: 0, y: 0, z: -90 },
    dimensions: { x: 58.5, y: 30.4, z: 288 },
  },
  {
    name: "building7.glb",
    position: { x: 93.204, y: 126, z: -219.9 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 131, y: 131, z: 236 },
  },
  {
    name: "building10.glb",
    position: { x: 37.925, y: 181.03, z: -105 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 42.7, y: 42.7, z: 184 },
  },
  {
    name: "building8.glb",
    position: { x: -53.462, y: 126, z: -193.1 },
    rotation: { x: 0, y: 0, z: 0 },
    dimensions: { x: 61, y: 23.6, z: 196 },
  },
  {
    name: "building9.glb",
    position: { x: -112.59, y: 126, z: -246.9 },
    rotation: { x: 0, y: 0, z: 90 },
    dimensions: { x: 38.4, y: 61.3, z: 379 },
  },
];

function publicUrl(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const b = base.endsWith("/") ? base : `${base}/`;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${b}${p}`;
}

function supportsWebGL(canvas: HTMLCanvasElement) {
  try {
    const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" })
      ?? canvas.getContext("webgl", { powerPreference: "high-performance" })
      ?? canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

function firstMesh(scene: ThreeTypes.Object3D) {
  let found: any = null;
  scene.traverse((o: ThreeTypes.Object3D) => {
    if (!found && (o as any).isMesh) found = o;
  });
  return found as any | null;
}

function createSeededRandom(seedStart: number) {
  let seed = seedStart >>> 0;
  return () => {
    seed = ((seed * 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function createNeonGridTexture(THREE: typeof import("three"), rnd: () => number) {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return null;

  g.fillStyle = "#05080f";
  g.fillRect(0, 0, size, size);

  const grad = g.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, "rgba(10,18,30,0.96)");
  grad.addColorStop(1, "rgba(2,5,10,1)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);

  g.globalCompositeOperation = "lighter";
  g.strokeStyle = "rgba(74, 255, 236, 0.14)";
  g.lineWidth = 1;
  for (let i = 0; i < size; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, size);
    g.stroke();

    g.beginPath();
    g.moveTo(0, i);
    g.lineTo(size, i);
    g.stroke();
  }

  g.strokeStyle = "rgba(255, 56, 95, 0.22)";
  g.lineWidth = 2;
  for (let i = 0; i < size; i += 128) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, size);
    g.stroke();
  }

  g.fillStyle = "rgba(74, 255, 236, 0.35)";
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const w = 1 + rnd() * 2;
    const h = 5 + rnd() * 18;
    g.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.needsUpdate = true;
  return tex;
}

function createRadialFogTexture(THREE: typeof import("three")) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return null;

  const radial = g.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.02,
    size * 0.5,
    size * 0.5,
    size * 0.48,
  );
  radial.addColorStop(0, "rgba(150,255,245,0.9)");
  radial.addColorStop(0.45, "rgba(100,225,255,0.36)");
  radial.addColorStop(1, "rgba(0,0,0,0)");

  g.fillStyle = radial;
  g.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createBillboardTexture(THREE: typeof import("three"), idx: number, rnd: () => number) {
  const width = 1024;
  const height = 512;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d");
  if (!g) return null;

  const colorSets = [
    ["#58f6ff", "#0f2a45", "#ff4e7a"],
    ["#7dffd6", "#1d2f22", "#ffb347"],
    ["#79c7ff", "#13233d", "#ff6f91"],
    ["#60ffea", "#1d1542", "#ffc857"],
    ["#8affff", "#1a2636", "#ff4d6d"],
    ["#8dfcc9", "#132b2e", "#ffd166"],
  ];
  const palette = colorSets[idx % colorSets.length] ?? colorSets[0]!;
  const base = palette[0] ?? "#58f6ff";
  const dark = palette[1] ?? "#102030";
  const accent = palette[2] ?? "#ff4e7a";

  g.fillStyle = "#02050a";
  g.fillRect(0, 0, width, height);

  const bg = g.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, `${dark}f2`);
  bg.addColorStop(1, "#020409f2");
  g.fillStyle = bg;
  g.fillRect(0, 0, width, height);

  g.strokeStyle = `${base}55`;
  g.lineWidth = 2;
  for (let x = 0; x < width; x += 48) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, height);
    g.stroke();
  }
  for (let y = 0; y < height; y += 34) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(width, y);
    g.stroke();
  }

  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 65; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const w = 4 + rnd() * 28;
    const h = 2 + rnd() * 8;
    g.fillStyle = i % 7 === 0 ? `${accent}cc` : `${base}aa`;
    g.fillRect(x, y, w, h);
  }

  g.globalCompositeOperation = "source-over";
  g.fillStyle = `${base}f0`;
  g.font = "900 104px 'Bank Gothic Medium BT', 'Rajdhani', sans-serif";
  g.textAlign = "left";
  g.textBaseline = "middle";

  const labels = ["AXIOM", "ORION", "NEON", "NEXUS", "VECTOR", "AERO"];
  const label = labels[idx % labels.length] ?? "AXIOM";
  g.fillText(label, 62, 170);

  g.font = "700 38px 'Bank Gothic Medium BT', 'Rajdhani', sans-serif";
  g.fillStyle = `${accent}f0`;
  g.fillText("CITY COMMERCIAL GRID", 64, 248);

  g.font = "600 24px 'IBM Plex Mono', monospace";
  g.fillStyle = "#d8f9ff";
  g.fillText(`BLOCK ${100 + idx * 7} // LIVE`, 66, 304);

  g.globalCompositeOperation = "screen";
  const scan = g.createLinearGradient(0, 0, 0, height);
  scan.addColorStop(0, "rgba(255,255,255,0.0)");
  scan.addColorStop(0.5, "rgba(255,255,255,0.14)");
  scan.addColorStop(1, "rgba(255,255,255,0.0)");
  g.fillStyle = scan;
  g.fillRect(0, height * 0.32, width, height * 0.2);

  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

function createSafeZoneShaderPassShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      uGamma: { value: 1.0 },
      uMidtoneLift: { value: 0.0 },
      uSafeCenter: { value: { x: 0.5, y: 0.56 } },
      uSafeRadius: { value: { x: 0.24, y: 0.26 } },
      uSafeSoftness: { value: 0.34 },
      uSafeDarken: { value: 0.16 },
      uLiftOutside: { value: 0.04 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uGamma;
      uniform float uMidtoneLift;
      uniform vec2 uSafeCenter;
      uniform vec2 uSafeRadius;
      uniform float uSafeSoftness;
      uniform float uSafeDarken;
      uniform float uLiftOutside;
      varying vec2 vUv;

      void main() {
        vec4 src = texture2D(tDiffuse, vUv);
        vec3 col = src.rgb;
        col = pow(max(col, vec3(0.0)), vec3(1.0 / max(uGamma, 0.001)));
        col += vec3(uMidtoneLift);

        vec2 p = (vUv - uSafeCenter) / max(uSafeRadius, vec2(0.0001));
        float d = length(p);
        float inner = smoothstep(0.0, 1.0, d);
        float centerMask = 1.0 - smoothstep(1.0, 1.0 + uSafeSoftness, d);
        col += vec3(uLiftOutside * inner);
        col *= (1.0 - centerMask * uSafeDarken);
        gl_FragColor = vec4(col, src.a);
      }
    `,
  };
}

function createSharpenShaderPassShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.0 },
      resolution: { value: { x: 1920, y: 1080 } },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      uniform vec2 resolution;
      varying vec2 vUv;

      void main() {
        vec2 texel = 1.0 / max(resolution, vec2(1.0));
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        vec3 blur = vec3(0.0);
        blur += texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb;
        blur += texture2D(tDiffuse, vUv + vec2(-texel.x, 0.0)).rgb;
        blur += texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        blur += texture2D(tDiffuse, vUv + vec2(0.0, -texel.y)).rgb;
        blur = (blur + c * 4.0) / 8.0;
        vec3 sharp = c + (c - blur) * amount;
        gl_FragColor = vec4(max(sharp, vec3(0.0)), 1.0);
      }
    `,
  };
}

export function OrionCityBackground({
  enabled,
  reducedMotion,
  onReady,
  onError,
  onProgress,
}: OrionCityBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [enabled, reducedMotion]);

  useEffect(() => {
    if (!enabled || reducedMotion) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!supportsWebGL(canvas)) {
      onError?.();
      return undefined;
    }
    const runtimeConfig = resolveOrionLoginRuntimeConfig();

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    let sentReady = false;
    let sentProgress = 0;

    const reportProgress = (value: number) => {
      if (disposed) return;
      const next = Math.max(0, Math.min(1, value));
      if (next + 0.0001 < sentProgress) return;
      if (next < 1 && next - sentProgress < 0.005) return;
      sentProgress = next;
      onProgress?.(next);
    };

    const markReady = () => {
      if (disposed || sentReady) return;
      sentReady = true;
      setReady(true);
      reportProgress(1);
      onReady?.();
    };

    (async () => {
      const THREE = await import("three");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { ShaderPass } = await import("three/examples/jsm/postprocessing/ShaderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const { FXAAShader } = await import("three/examples/jsm/shaders/FXAAShader.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
      const { KTX2Loader } = await import("three/examples/jsm/loaders/KTX2Loader.js");
      const { EXRLoader } = await import("three/examples/jsm/loaders/EXRLoader.js");

      if (disposed) return;
      reportProgress(0.06);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: "high-performance",
      });
      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      (renderer as any).physicallyCorrectLights = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, runtimeConfig.post.pixelRatioCap));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = runtimeConfig.lighting.exposure;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070d18, 0.00062);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = runtimeConfig.lighting.fogDensity;
      }

      const camera = new THREE.PerspectiveCamera(60, 1, 1.5, 3200);
      camera.position.set(0, 200, 632);
      scene.add(camera);

      const composerRenderTarget = new THREE.WebGLRenderTarget(1, 1, {
        depthBuffer: true,
        stencilBuffer: false,
      });
      if ((renderer.capabilities as any).isWebGL2) {
        (composerRenderTarget as any).samples = Math.max(1, Math.min(8, runtimeConfig.post.msaaSamples));
      }
      const composer = new EffectComposer(renderer, composerRenderTarget);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        runtimeConfig.post.bloomStrength,
        runtimeConfig.post.bloomRadius,
        runtimeConfig.post.bloomThreshold,
      );
      composer.addPass(bloom);

      const safeZonePass = runtimeConfig.post.safeZoneEnabled
        ? new ShaderPass(createSafeZoneShaderPassShader() as any)
        : null;
      if (safeZonePass) {
        const safeZoneUniforms = (safeZonePass.material as any).uniforms;
        safeZoneUniforms.uGamma.value = runtimeConfig.lighting.gamma;
        safeZoneUniforms.uMidtoneLift.value = runtimeConfig.lighting.midtoneLift;
        safeZoneUniforms.uSafeCenter.value.x = runtimeConfig.lighting.safeZone.centerX;
        safeZoneUniforms.uSafeCenter.value.y = runtimeConfig.lighting.safeZone.centerY;
        safeZoneUniforms.uSafeRadius.value.x = runtimeConfig.lighting.safeZone.radiusX;
        safeZoneUniforms.uSafeRadius.value.y = runtimeConfig.lighting.safeZone.radiusY;
        safeZoneUniforms.uSafeSoftness.value = runtimeConfig.lighting.safeZone.softness;
        safeZoneUniforms.uSafeDarken.value = runtimeConfig.lighting.safeZone.darken;
        safeZoneUniforms.uLiftOutside.value = runtimeConfig.lighting.safeZone.liftOutside;
        composer.addPass(safeZonePass);
      }

      const sharpenPass = runtimeConfig.post.sharpenAmount > 0.001
        ? new ShaderPass(createSharpenShaderPassShader() as any)
        : null;
      const sharpenUniforms = sharpenPass ? (sharpenPass.material as any).uniforms : null;
      if (sharpenPass && sharpenUniforms) {
        sharpenUniforms.amount.value = runtimeConfig.post.sharpenAmount;
        composer.addPass(sharpenPass);
      }
      const fxaaPass = runtimeConfig.post.fxaaEnabled ? new ShaderPass(FXAAShader) : null;
      if (fxaaPass) composer.addPass(fxaaPass);
      const fxaaUniforms = fxaaPass ? (fxaaPass.material as any).uniforms : null;
      reportProgress(0.12);

      const amb = new THREE.AmbientLight(0xffffff, 0.42);
      const hemi = new THREE.HemisphereLight(0x8bcfff, 0x120a11, 0.5);
      const key = new THREE.DirectionalLight(0xb5ddff, 0.62);
      key.position.set(28, 44, 24);
      const fill = new THREE.PointLight(0x44f7e0, 0.58, 340, 2);
      fill.position.set(-62, 30, -96);
      const rim = new THREE.PointLight(0xff517f, 0.38, 330, 2);
      rim.position.set(70, 24, -128);
      scene.add(amb, hemi, key, fill, rim);

      const world = new THREE.Group();
      scene.add(world);
      reportProgress(0.16);

      const loadingManager = new THREE.LoadingManager();
      const managerStart = 0.18;
      const managerEnd = 0.9;
      const reportManagerProgress = (value: number) => {
        const clamped = Math.max(0, Math.min(1, value));
        reportProgress(managerStart + ((managerEnd - managerStart) * clamped));
      };
      loadingManager.onStart = () => reportManagerProgress(0);
      loadingManager.onProgress = (_url: string, loaded: number, total: number) => {
        if (total <= 0) return;
        reportManagerProgress(loaded / total);
      };
      loadingManager.onLoad = () => reportManagerProgress(1);

      const dracoLoader = new DRACOLoader(loadingManager);
      dracoLoader.setDecoderPath(publicUrl("draco/gltf/"));
      dracoLoader.setDecoderConfig({ type: "js" });

      const ktx2Loader = new KTX2Loader(loadingManager);
      ktx2Loader.setTranscoderPath(publicUrl("basis/"));
      ktx2Loader.detectSupport(renderer);

      const gltfLoader = new GLTFLoader(loadingManager);
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.setKTX2Loader(ktx2Loader);

      const exrLoader = new EXRLoader(loadingManager);
      const maxAnisotropy = Math.max(1, renderer.capabilities.getMaxAnisotropy());
      const textureAniso = Math.min(runtimeConfig.textures.anisotropy, maxAnisotropy);
      const rnd = createSeededRandom(runtimeConfig.seed);
      const rand = (min: number, max: number) => min + rnd() * (max - min);

      const loadedTextures = new Set<ThreeTypes.Texture>();
      const loadKtx = async (name: string, isColor = false) => {
        const tex = await ktx2Loader.loadAsync(publicUrl(`assets/orion/original/high/${name}`));
        tex.flipY = false;
        tex.anisotropy = textureAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        if (isColor) (tex as any).colorSpace = (THREE as any).SRGBColorSpace ?? (tex as any).colorSpace;
        loadedTextures.add(tex);
        return tex;
      };

      const [
        mainDiffuse,
        mainAlpha,
        building4Cars,
        building4Decals,
        set1Diffuse,
        set1Emission,
        set1RM,
        set2Diffuse,
        set2Emission,
        set2RM,
        flyingCarTex,
        skyHdr,
      ] = await Promise.all([
        loadKtx("main-diffuse.ktx2", true),
        loadKtx("main-alpha.ktx2"),
        loadKtx("building4-cars-work.ktx2", true),
        loadKtx("building4-emission-decals.ktx2", true),
        loadKtx("BG-Buildings-Set1_PBR_Diffuse.ktx2", true),
        loadKtx("BG-Buildings-Set1_PBR_Emission.ktx2", true),
        loadKtx("BG-Buildings-Set1_PBR_Roughness-Metalness.ktx2"),
        loadKtx("BG-Buildings-Set2_PBR_Diffuse-Alpha.ktx2", true),
        loadKtx("BG-Buildings-Set2_PBR_Emission-Fixed.ktx2", true),
        loadKtx("BG-Buildings-Set2_PBR_Roughness-Metalness.ktx2"),
        loadKtx("flying-car.ktx2", true),
        exrLoader.loadAsync(publicUrl("assets/orion/original/sky-512-HDR.exr")),
      ]);

      skyHdr.mapping = THREE.EquirectangularReflectionMapping;
      skyHdr.anisotropy = Math.min(Math.max(2, textureAniso), maxAnisotropy);
      loadedTextures.add(skyHdr as unknown as ThreeTypes.Texture);
      scene.environment = skyHdr;

      if (disposed) {
        dracoLoader.dispose();
        ktx2Loader.dispose();
        return;
      }

      const level = (await gltfLoader.loadAsync(publicUrl("assets/orion/original/high/level.glb"))).scene;
      if (disposed) {
        dracoLoader.dispose();
        ktx2Loader.dispose();
        return;
      }
      reportProgress(0.94);
      world.add(level);
      world.updateMatrixWorld(true);

      // Camera framing: push to city core, keep lower camera with a stronger upward center look.
      const baseCam = new THREE.Vector3(0.924, 200.2275, 632.5911);
      const lookTarget = new THREE.Vector3(0.9261, -3.8981, -126.0006);
      const preloaderCam = level.getObjectByName("Preloader-Camera");
      const cityCenter = level.getObjectByName("City-Center");

      if (preloaderCam) {
        preloaderCam.getWorldPosition(baseCam);
        const q = new THREE.Quaternion();
        preloaderCam.getWorldQuaternion(q);
        lookTarget.copy(baseCam).add(new THREE.Vector3(0, 0, -1).applyQuaternion(q).multiplyScalar(900));
      }
      if (cityCenter) cityCenter.getWorldPosition(lookTarget);
      const cityCenterPos = lookTarget.clone();

      const cityBounds = new THREE.Box3().setFromObject(level.getObjectByName("Main") ?? level);
      const cityGroundY = cityBounds.min.y;
      const centerX = cityCenterPos.x;
      const centerZ = cityCenterPos.z;

      const dirToCenter = new THREE.Vector3().subVectors(cityCenterPos, baseCam);
      if (dirToCenter.lengthSq() > 1e-6) {
        dirToCenter.normalize();
        const worldUp = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(dirToCenter, worldUp).normalize();
        const forwardOffset = 34;
        const verticalOffset = -14;
        const sideOffset = -8;
        const verticalLookMultiplier = 2.5;
        const lookLift = THREE.MathUtils.clamp(52 * verticalLookMultiplier, 108, 166);

        baseCam.addScaledVector(dirToCenter, forwardOffset);
        baseCam.addScaledVector(worldUp, verticalOffset);
        baseCam.addScaledVector(right, sideOffset);

        lookTarget.copy(cityCenterPos);
        lookTarget.addScaledVector(dirToCenter, 76);
        lookTarget.addScaledVector(worldUp, lookLift);
        lookTarget.addScaledVector(right, 1.5);
        lookTarget.y = THREE.MathUtils.clamp(
          lookTarget.y,
          cityCenterPos.y + 92,
          cityCenterPos.y + 172,
        );
      } else {
        baseCam.set(centerX - 9, cityGroundY + 166, centerZ + 565);
        lookTarget.set(centerX + 2, cityGroundY + 304, centerZ - 164);
      }
      camera.position.copy(baseCam);
      camera.lookAt(lookTarget);

      const viewDirXZ = new THREE.Vector2(lookTarget.x - baseCam.x, lookTarget.z - baseCam.z);
      if (viewDirXZ.lengthSq() > 1e-6) viewDirXZ.normalize();
      const viewRightXZ = new THREE.Vector2(-viewDirXZ.y, viewDirXZ.x);
      const corridorDepthMin = 40;
      const corridorDepthMax = 1680;
      const corridorHalfWidth = 390;
      const inViewCorridor = (x: number, z: number) => {
        const rel = new THREE.Vector2(x - baseCam.x, z - baseCam.z);
        const depth = rel.dot(viewDirXZ);
        if (depth < corridorDepthMin || depth > corridorDepthMax) return false;
        const lateral = Math.abs(rel.dot(viewRightXZ));
        if (lateral < corridorHalfWidth) return true;
        const nearCameraDepth = 620;
        const nearCameraHalfWidth = 580;
        return depth < nearCameraDepth && lateral < nearCameraHalfWidth;
      };

      const sceneMaterials = new Set<ThreeTypes.Material>();

      const registerMaterial = <T extends ThreeTypes.Material>(m: T) => {
        sceneMaterials.add(m);
        return m;
      };

      const skyGeo = new THREE.SphereGeometry(2200, 40, 32);
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        uniforms: {
          top: { value: new THREE.Color("#4ca3ff") },
          mid: { value: new THREE.Color("#162748") },
          bottom: { value: new THREE.Color("#060711") },
          intensity: { value: 0.42 },
        },
        vertexShader: `
          varying vec3 vWorld;
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: `
          varying vec3 vWorld;
          uniform vec3 top;
          uniform vec3 mid;
          uniform vec3 bottom;
          uniform float intensity;

          void main() {
            float h = normalize(vWorld).y * 0.5 + 0.5;
            vec3 c = mix(bottom, mid, smoothstep(0.05, 0.58, h));
            c = mix(c, top, smoothstep(0.56, 1.0, h));
            gl_FragColor = vec4(c * intensity, 1.0);
          }
        `,
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      skyDome.position.set(centerX, cityGroundY + 460, centerZ - 120);
      world.add(skyDome);

      const skyGlowGeo = new THREE.SphereGeometry(1800, 24, 18);
      const skyGlowMat = registerMaterial(new THREE.MeshBasicMaterial({
        color: 0x73d7ff,
        transparent: true,
        opacity: 0.08,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }));
      const skyGlow = new THREE.Mesh(skyGlowGeo, skyGlowMat);
      skyGlow.position.copy(skyDome.position);
      world.add(skyGlow);

      const gridTex = createNeonGridTexture(THREE, rnd);
      if (gridTex) {
        gridTex.anisotropy = Math.min(textureAniso, maxAnisotropy);
        gridTex.minFilter = THREE.LinearMipmapLinearFilter;
        gridTex.magFilter = THREE.LinearFilter;
        loadedTextures.add(gridTex);
      }

      const floorMat = registerMaterial(new THREE.MeshStandardMaterial({
        color: 0x0a101a,
        map: gridTex ?? null,
        emissiveMap: gridTex ?? null,
        emissive: new THREE.Color(0x4affea),
        emissiveIntensity: 0.18,
        metalness: 0.9,
        roughness: 0.27,
        envMapIntensity: 0.42,
      }));

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(3000, 3200, 1, 1),
        floorMat,
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(centerX, cityGroundY - 2.6, centerZ - 150);
      floor.receiveShadow = false;
      world.add(floor);

      const floorGlowTex = createRadialFogTexture(THREE);
      if (floorGlowTex) {
        floorGlowTex.anisotropy = Math.min(Math.max(2, Math.floor(textureAniso / 2)), maxAnisotropy);
        loadedTextures.add(floorGlowTex);
      }

      const floorGlowMat = registerMaterial(new THREE.MeshBasicMaterial({
        map: floorGlowTex ?? null,
        color: 0x56e9ff,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));

      const floorGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(2200, 1600),
        floorGlowMat,
      );
      floorGlow.rotation.x = -Math.PI / 2;
      floorGlow.position.set(centerX, cityGroundY - 0.2, centerZ - 120);
      world.add(floorGlow);

      const laneGeo = new THREE.PlaneGeometry(16, 1700);
      const laneMat = registerMaterial(new THREE.MeshBasicMaterial({
        color: 0x41ffe6,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      const laneGroup = new THREE.Group();
      if (runtimeConfig.traffic.mode === "legacy") {
        const laneCount = Math.max(1, runtimeConfig.traffic.legacyLaneCount);
        const laneSpacing = runtimeConfig.traffic.legacyLaneSpacing;
        for (let i = 0; i < laneCount; i++) {
          const lane = new THREE.Mesh(laneGeo, laneMat);
          const t = i - (laneCount - 1) * 0.5;
          lane.position.set(centerX + (t * laneSpacing), cityGroundY - 0.15, centerZ - 320);
          lane.rotation.x = -Math.PI / 2;
          laneGroup.add(lane);
        }
      } else {
        const laneOffsets = runtimeConfig.traffic.laneOffsets.length > 0
          ? runtimeConfig.traffic.laneOffsets
          : [-18, 0, 18];
        for (const laneOffset of laneOffsets) {
          const lane = new THREE.Mesh(laneGeo, laneMat);
          lane.position.set(centerX + laneOffset * 3.8, cityGroundY - 0.15, centerZ - 320);
          lane.rotation.x = -Math.PI / 2;
          laneGroup.add(lane);
        }
      }
      world.add(laneGroup);

      const readabilityBoost = runtimeConfig.lighting.readabilityBoost;
      const materialCfg = runtimeConfig.materials;

      const set1Mat = registerMaterial(new THREE.MeshStandardMaterial({
        map: set1Diffuse,
        emissiveMap: set1Emission,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.95 * readabilityBoost,
        roughnessMap: set1RM,
        metalnessMap: set1RM,
        metalness: materialCfg.building.metalness,
        roughness: materialCfg.building.roughness,
        envMapIntensity: materialCfg.building.envMapIntensity,
        side: THREE.DoubleSide,
      }));

      const set2Mat = registerMaterial(new THREE.MeshStandardMaterial({
        map: set2Diffuse,
        emissiveMap: set2Emission,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.95 * readabilityBoost,
        roughnessMap: set2RM,
        metalnessMap: set2RM,
        metalness: materialCfg.building.metalness,
        roughness: materialCfg.building.roughness,
        envMapIntensity: materialCfg.building.envMapIntensity,
        alphaTest: materialCfg.building.alphaTest,
        transparent: false,
        side: THREE.DoubleSide,
      }));
      if ("alphaToCoverage" in (set2Mat as any)) {
        (set2Mat as any).alphaToCoverage = materialCfg.building.alphaToCoverage;
      }

      const building4CustomMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Cars,
        emissiveMap: building4Decals,
        roughnessMap: set1RM,
        metalnessMap: set1RM,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 2.5 * readabilityBoost,
        metalness: materialCfg.building.metalness,
        roughness: materialCfg.building.roughness,
        envMapIntensity: materialCfg.building.envMapIntensity,
        side: THREE.DoubleSide,
      }));

      const mainMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: mainDiffuse,
        emissiveMap: mainDiffuse,
        alphaMap: mainAlpha,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: materialCfg.main.emissiveBase * readabilityBoost,
        metalness: materialCfg.main.metalness,
        roughness: materialCfg.main.roughness,
        alphaTest: materialCfg.main.alphaTest,
        transparent: false,
        side: THREE.DoubleSide,
      }));
      if ("alphaToCoverage" in (mainMat as any)) {
        (mainMat as any).alphaToCoverage = materialCfg.building.alphaToCoverage;
      }

      const animatedSolidMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Cars,
        emissiveMap: building4Cars,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: materialCfg.animatedSolid.emissiveBase * readabilityBoost,
        metalness: materialCfg.animatedSolid.metalness,
        roughness: materialCfg.animatedSolid.roughness,
        side: THREE.DoubleSide,
      }));

      const animatedTransparentMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Decals,
        emissiveMap: building4Decals,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: materialCfg.animatedTransparent.emissiveBase * readabilityBoost,
        alphaTest: materialCfg.animatedTransparent.alphaTest,
        transparent: false,
        side: THREE.DoubleSide,
      }));
      if ("alphaToCoverage" in (animatedTransparentMat as any)) {
        (animatedTransparentMat as any).alphaToCoverage = materialCfg.building.alphaToCoverage;
      }

      // Apply Orion material overrides from original runtime (main + animated atlas meshes).
      level.traverse((o: ThreeTypes.Object3D) => {
        const nm = o.name || "";
        const mesh = o as any;
        if (!mesh.isMesh) return;

        if (/^Main(?:\.|$)/.test(nm)) {
          mesh.material = mainMat;
        } else if (nm === "Animated-Textures-Solid") {
          mesh.material = animatedSolidMat;
        } else if (nm === "Animated-Textures-Transparent") {
          if (materialCfg.animatedTransparent.enabled) {
            mesh.visible = true;
            mesh.material = animatedTransparentMat;
          } else {
            mesh.visible = false;
          }
        }

        mesh.castShadow = false;
        mesh.receiveShadow = false;
      });

      // Hide gameplay-only objects.
      level.traverse((o: ThreeTypes.Object3D) => {
        const nm = o.name || "";
        if (
          nm === "Collision"
          || nm === "Elevator-Collision"
          || nm === "Elevator-Mesh"
          || nm === "Coin"
          || nm.startsWith("Coin-Instance")
          || nm.startsWith("Race-")
          || nm.startsWith("Zipline-")
          || nm === "Respawn"
          || nm === "Dock"
          || nm === "Spawn"
          || nm === "Spawn-End"
          || nm === "Elevator"
          || nm === "Elevator-End"
        ) o.visible = false;
      });

      // Building assets and custom placements (same approach as original Orion runtime).
      const buildingFiles = [
        "building1.glb",
        "building2.glb",
        "building3.glb",
        "building4.glb",
        "building5.glb",
        "building6.glb",
        "building7.glb",
        "building8.glb",
        "building9.glb",
        "building10.glb",
      ];

      const buildingAssets = new Map<string, BuildingAsset>();
      const buildingLoaded = await Promise.all(buildingFiles.map(async (name) => {
        try {
          const gltf = await gltfLoader.loadAsync(publicUrl(`assets/orion/original/high/${name}`));
          const mesh = firstMesh(gltf.scene);
          if (!mesh?.geometry) return null;

          let originalMaterial: ThreeTypes.Material | undefined;
          if (BUILDING_USE_ORIGINAL.has(name) && mesh.material) {
            const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
            if (src) {
              originalMaterial = src.clone();
              if ((originalMaterial as any).isMeshStandardMaterial) {
                const mm = originalMaterial as any;
                mm.emissiveIntensity = Math.min(1.1, Math.max(0.6, Number(mm.emissiveIntensity || 0.6)));
                mm.side = THREE.DoubleSide;
              }
              if (originalMaterial) sceneMaterials.add(originalMaterial);
            }
          }

          return {
            name,
            asset: {
              name,
              geometry: mesh.geometry.clone(),
              originalMaterial,
            } as BuildingAsset,
          };
        } catch {
          return null;
        }
      }));
      for (const item of buildingLoaded) {
        if (!item) continue;
        buildingAssets.set(item.name, item.asset);
      }

      const assetBounds = new Map<string, ThreeTypes.Box3>();
      for (const [name, asset] of buildingAssets.entries()) {
        asset.geometry.computeBoundingBox();
        if (!asset.geometry.boundingBox) continue;
        assetBounds.set(name, asset.geometry.boundingBox.clone());
      }

      const pickBuildingMaterial = (name: string, asset: BuildingAsset) => {
        if (name === "building4.glb") return building4CustomMat;
        if (BUILDING_USE_ORIGINAL.has(name) && asset.originalMaterial) return asset.originalMaterial;
        if (BUILDING_USE_SET2.has(name)) return set2Mat;
        return set1Mat;
      };

      const placeBuilding = (cfg: {
        name: string;
        x: number;
        z: number;
        groundY: number;
        yaw: number;
        targetHeight: number;
        stretchX?: number;
        stretchZ?: number;
        scaleMul?: number;
        allowInCorridor?: boolean;
      }) => {
        if (!cfg.allowInCorridor && inViewCorridor(cfg.x, cfg.z)) return;
        if (!cfg.allowInCorridor) {
          const rel = new THREE.Vector2(cfg.x - baseCam.x, cfg.z - baseCam.z);
          const depth = rel.dot(viewDirXZ);
          const lateral = Math.abs(rel.dot(viewRightXZ));
          if (depth > -80 && depth < 840 && lateral < 760) return;
        }

        const asset = buildingAssets.get(cfg.name);
        const bounds = assetBounds.get(cfg.name);
        if (!asset || !bounds) return;

        const material = pickBuildingMaterial(cfg.name, asset);
        const mesh = new THREE.Mesh(asset.geometry, material);

        const srcH = Math.max(1, bounds.max.y - bounds.min.y);
        const baseScale = (cfg.targetHeight / srcH) * (cfg.scaleMul ?? 1);
        const sx = baseScale * (cfg.stretchX ?? 1);
        const sy = baseScale;
        const sz = baseScale * (cfg.stretchZ ?? 1);

        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = cfg.yaw;
        mesh.position.set(cfg.x, cfg.groundY - (bounds.min.y * sy), cfg.z);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        world.add(mesh);
      };

      // Keep Orion custom landmark placements but align them to current city ground.
      for (const spec of CUSTOM_BUILDING_SPECS) {
        placeBuilding({
          name: spec.name,
          x: spec.position.x,
          z: spec.position.z,
          groundY: cityGroundY + rand(-8, 18),
          yaw: THREE.MathUtils.degToRad(spec.rotation.y),
          targetHeight: Math.max(150, spec.dimensions.z),
          stretchX: rand(0.9, 1.14),
          stretchZ: rand(0.9, 1.14),
          scaleMul: rand(0.95, 1.1),
          allowInCorridor: false,
        });
      }

      // Build a dense skyline around the center to eliminate empty edges on wide screens.
      const lightPool = ["building1.glb", "building2.glb", "building3.glb", "building4.glb", "building5.glb", "building6.glb"];
      const heavyPool = ["building7.glb", "building8.glb", "building9.glb", "building10.glb"];
      const pickName = () => {
        const pool = rnd() < 0.28 ? heavyPool : lightPool;
        return pool[Math.floor(rnd() * pool.length)]!;
      };

      const rings = [
        { radius: 220, count: 18, minH: 170, maxH: 280, jitter: 28 },
        { radius: 330, count: 26, minH: 210, maxH: 360, jitter: 38 },
        { radius: 470, count: 34, minH: 240, maxH: 440, jitter: 52 },
        { radius: 640, count: 42, minH: 280, maxH: 560, jitter: 66 },
        { radius: 840, count: 52, minH: 320, maxH: 700, jitter: 84 },
      ];

      for (const ring of rings) {
        const offset = rand(0, Math.PI * 2);
        for (let i = 0; i < ring.count; i++) {
          const a = offset + (i / ring.count) * Math.PI * 2;
          const x = centerX + Math.cos(a) * ring.radius + rand(-ring.jitter, ring.jitter);
          const z = centerZ + Math.sin(a) * ring.radius + rand(-ring.jitter, ring.jitter);

          // Keep the immediate center cleaner for login readability.
          const nearCenter = Math.abs(x - centerX) < 260 && Math.abs(z - centerZ) < 340;
          if (nearCenter && ring.radius <= 640) continue;

          const name = pickName();
          placeBuilding({
            name,
            x,
            z,
            groundY: cityGroundY + rand(-12, 22),
            yaw: a + Math.PI * 0.5 + rand(-0.55, 0.55),
            targetHeight: rand(ring.minH, ring.maxH),
            stretchX: rand(0.85, 1.22),
            stretchZ: rand(0.84, 1.24),
            scaleMul: rand(0.9, 1.24),
            allowInCorridor: false,
          });
        }
      }

      // Foreground strip between camera and center to avoid dark lower gaps.
      const camDir = new THREE.Vector2(baseCam.x - centerX, baseCam.z - centerZ);
      if (camDir.lengthSq() > 1e-6) {
        camDir.normalize();
        const right = new THREE.Vector2(-camDir.y, camDir.x);
        for (let i = -14; i <= 14; i++) {
          const lateral = i * 50 + rand(-18, 18);
          if (Math.abs(lateral) < 320) continue;
          const forward = rand(520, 980);
          const x = centerX + (camDir.x * forward) + (right.x * lateral);
          const z = centerZ + (camDir.y * forward) + (right.y * lateral);
          if (Math.abs(x - centerX) < 300 && Math.abs(z - centerZ) < 380) continue;
          placeBuilding({
            name: (i % 3 === 0
              ? heavyPool[Math.floor(rnd() * heavyPool.length)]
              : lightPool[Math.floor(rnd() * lightPool.length)])!,
            x,
            z,
            groundY: cityGroundY + rand(-20, 10),
            yaw: rand(-Math.PI, Math.PI),
            targetHeight: rand(200, 520),
            stretchX: rand(0.86, 1.21),
            stretchZ: rand(0.82, 1.24),
            scaleMul: rand(0.96, 1.28),
            allowInCorridor: false,
          });
        }
      }

      // Distant skyline wall to avoid visible black bands on ultra-wide monitors.
      for (let i = 0; i < 96; i++) {
        const a = rand(-Math.PI, Math.PI);
        const radius = rand(950, 1400);
        const x = centerX + Math.cos(a) * radius;
        const z = centerZ + Math.sin(a) * radius;
        placeBuilding({
          name: pickName(),
          x,
          z,
          groundY: cityGroundY + rand(-24, 18),
          yaw: a + Math.PI * 0.5 + rand(-0.4, 0.4),
          targetHeight: rand(360, 920),
          stretchX: rand(0.9, 1.3),
          stretchZ: rand(0.9, 1.28),
          scaleMul: rand(1.12, 1.48),
          allowInCorridor: false,
        });
      }

      // Air traffic: keep legacy motion for default mode, pooled traffic for V2.
      const trafficCfg = runtimeConfig.traffic;
      const useLegacyTraffic = trafficCfg.mode === "legacy";
      const carTemplates = [
        level.getObjectByName("flying-car-traffic-1"),
        level.getObjectByName("flying-car-traffic-2"),
        level.getObjectByName("flying-car-traffic-3"),
        level.getObjectByName("flying-car"),
      ].filter(Boolean) as ThreeTypes.Object3D[];

      for (const t of carTemplates) t.visible = false;

      const carMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: flyingCarTex,
        emissiveMap: flyingCarTex,
        color: 0xffffff,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.72,
        metalness: 0.72,
        roughness: 0.28,
        side: THREE.DoubleSide,
      }));

      type TrafficCar = {
        m: ThreeTypes.Object3D;
        active: boolean;
        start: ThreeTypes.Vector3;
        end: ThreeTypes.Vector3;
        u: number;
        rate: number;
        phase: number;
        bob: number;
      };

      type TrafficPath = {
        start: ThreeTypes.Vector3;
        end: ThreeTypes.Vector3;
      };

      const traffic = new THREE.Group();
      world.add(traffic);
      const cars: TrafficCar[] = [];
      const trafficPaths: TrafficPath[] = [];

      const basePaths: TrafficPath[] = [];
      for (let i = 1; i <= 6; i++) {
        const s = level.getObjectByName(`air-traffic-${i}-start`);
        const e = level.getObjectByName(`air-traffic-${i}-end`);
        if (!s || !e) continue;
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        s.getWorldPosition(start);
        e.getWorldPosition(end);
        basePaths.push({ start, end });
      }

      const maxTrafficActive = Math.max(0, Math.min(trafficCfg.maxActive, 48));
      let activeTrafficCount = 0;
      let trafficSpawnTimer = 0;
      const despawnTrafficCar = (car: TrafficCar) => {
        if (!car.active) return;
        car.active = false;
        car.m.visible = false;
        activeTrafficCount = Math.max(0, activeTrafficCount - 1);
      };
      const spawnTrafficCar = () => {
        if (!trafficCfg.enabled || trafficPaths.length === 0) return;
        if (activeTrafficCount >= maxTrafficActive) return;
        const car = cars.find((item) => !item.active);
        if (!car) return;
        const path = trafficPaths[Math.floor(rnd() * trafficPaths.length)];
        if (!path) return;

        car.active = true;
        activeTrafficCount += 1;
        car.start.copy(path.start);
        car.end.copy(path.end);
        car.u = rnd() * 0.12;
        car.rate = rand(trafficCfg.speedMin, trafficCfg.speedMax);
        car.phase = rnd() * Math.PI * 2;
        car.bob = rand(trafficCfg.bobMin, trafficCfg.bobMax);
        car.m.visible = true;
      };

      if (useLegacyTraffic) {
        for (let i = 0; i < Math.min(basePaths.length, 6); i++) {
          const path = basePaths[i]!;
          const tpl = carTemplates[i % Math.max(1, carTemplates.length)];
          if (!tpl) continue;

          const m = tpl.clone(true);
          m.traverse((o: ThreeTypes.Object3D) => {
            o.visible = true;
            const mesh = o as any;
            if (mesh.isMesh) {
              mesh.material = carMat;
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            }
          });
          m.visible = true;
          m.scale.setScalar(0.9 + rnd() * 0.32);
          traffic.add(m);
          cars.push({
            m,
            active: true,
            start: path.start.clone(),
            end: path.end.clone(),
            u: rnd(),
            rate: 0.033 + rnd() * 0.035,
            phase: rnd() * Math.PI * 2,
            bob: 0.7 + rnd() * 1.3,
          });
        }
      } else {
        for (const path of basePaths) {
          const dir = new THREE.Vector3().subVectors(path.end, path.start).normalize();
          const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
          for (const laneOffset of trafficCfg.laneOffsets) {
            const start = path.start.clone().addScaledVector(right, laneOffset);
            const end = path.end.clone().addScaledVector(right, laneOffset);
            trafficPaths.push({ start, end });
          }
        }

        for (let i = 0; i < maxTrafficActive; i++) {
          const tpl = carTemplates[i % Math.max(1, carTemplates.length)];
          if (!tpl) continue;
          const m = tpl.clone(true);
          m.traverse((o: ThreeTypes.Object3D) => {
            o.visible = true;
            const mesh = o as any;
            if (mesh.isMesh) {
              mesh.material = carMat;
              mesh.castShadow = false;
              mesh.receiveShadow = false;
            }
          });
          m.visible = false;
          m.scale.setScalar(0.86 + rnd() * 0.38);
          traffic.add(m);
          cars.push({
            m,
            active: false,
            start: new THREE.Vector3(),
            end: new THREE.Vector3(),
            u: 0,
            rate: 0.03,
            phase: rnd() * Math.PI * 2,
            bob: 0.8,
          });
        }

        trafficSpawnTimer = rand(trafficCfg.spawnMin, trafficCfg.spawnMax);
        const warmStartCount = Math.min(maxTrafficActive, Math.max(2, Math.floor(maxTrafficActive * 0.35)));
        for (let i = 0; i < warmStartCount; i++) spawnTrafficCar();
      }

      // Billboards / ads.
      type BillboardActor = {
        mesh: ThreeTypes.Mesh;
        material: ThreeTypes.MeshStandardMaterial;
        baseY: number;
        baseIntensity: number;
        animated: boolean;
        phase: number;
      };
      const billboards: BillboardActor[] = [];
      const billboardCfg = runtimeConfig.billboards;
      if (billboardCfg.enabled && billboardCfg.count > 0) {
        const billboardGroup = new THREE.Group();
        world.add(billboardGroup);

        const anchors = [
          { x: centerX - 620, y: cityGroundY + 188, z: centerZ - 230, yaw: 0.48, w: 168, h: 76 },
          { x: centerX + 624, y: cityGroundY + 182, z: centerZ - 218, yaw: -0.47, w: 162, h: 74 },
          { x: centerX - 700, y: cityGroundY + 246, z: centerZ - 402, yaw: 0.54, w: 154, h: 70 },
          { x: centerX + 708, y: cityGroundY + 238, z: centerZ - 388, yaw: -0.52, w: 152, h: 68 },
          { x: centerX - 768, y: cityGroundY + 304, z: centerZ - 618, yaw: 0.61, w: 146, h: 64 },
          { x: centerX + 780, y: cityGroundY + 296, z: centerZ - 596, yaw: -0.59, w: 144, h: 64 },
        ];
        const targetCount = Math.min(billboardCfg.count, anchors.length);

        for (let i = 0; i < targetCount; i++) {
          const a = anchors[i];
          if (!a) continue;
          const tex = createBillboardTexture(THREE, i, rnd);
          if (!tex) continue;
          tex.flipY = false;
          tex.anisotropy = textureAniso;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.needsUpdate = true;
          loadedTextures.add(tex);

          const mat = registerMaterial(new THREE.MeshStandardMaterial({
            map: tex,
            emissiveMap: tex,
            color: 0xffffff,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 1.12 + rnd() * 0.22,
            roughness: 0.52,
            metalness: 0.22,
            transparent: true,
            alphaTest: 0.06,
            side: THREE.DoubleSide,
          }));
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), mat);
          mesh.position.set(a.x, a.y, a.z);
          mesh.rotation.y = a.yaw;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          billboardGroup.add(mesh);

          billboards.push({
            mesh,
            material: mat,
            baseY: a.y,
            baseIntensity: mat.emissiveIntensity,
            animated: i < billboardCfg.animatedCount,
            phase: rnd() * Math.PI * 2,
          });
        }
      }

      // Rain (1-2 layers by preset).
      type RainLayer = {
        geo: ThreeTypes.BufferGeometry;
        spd: Float32Array;
        count: number;
        anchor: ThreeTypes.Group;
        spreadX: number;
        spreadZ: number;
        resetTop: number;
        lenMax: number;
      };
      const rainLayers: RainLayer[] = [];
      const rainCfg = runtimeConfig.rain;
      if (rainCfg.mode === "legacy") {
        const rainCount = Math.max(200, rainCfg.countPerLayer);
        const rainPos = new Float32Array(rainCount * 2 * 3);
        const rainSpd = new Float32Array(rainCount);
        for (let i = 0; i < rainCount; i++) {
          const x = (rnd() - 0.5) * rainCfg.legacySpreadX;
          const y = 10 + rnd() * 280;
          const z = -30 - rnd() * rainCfg.legacySpreadZ;
          const len = 0.9 + rnd() * rainCfg.legacyLenMax;
          rainPos[(i * 6) + 0] = x;
          rainPos[(i * 6) + 1] = y;
          rainPos[(i * 6) + 2] = z;
          rainPos[(i * 6) + 3] = x;
          rainPos[(i * 6) + 4] = y - len;
          rainPos[(i * 6) + 5] = z;
          rainSpd[i] = 34 + rnd() * 72;
        }
        const rainGeo = new THREE.BufferGeometry();
        rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
        const rainMat = registerMaterial(new THREE.LineBasicMaterial({
          color: 0xbce7ff,
          transparent: true,
          opacity: 0.28,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }));
        const rain = new THREE.LineSegments(rainGeo, rainMat);
        const rainAnchor = new THREE.Group();
        rainAnchor.add(rain);
        world.add(rainAnchor);
        rainLayers.push({
          geo: rainGeo,
          spd: rainSpd,
          count: rainCount,
          anchor: rainAnchor,
          spreadX: rainCfg.legacySpreadX,
          spreadZ: rainCfg.legacySpreadZ,
          resetTop: rainCfg.legacyResetTop,
          lenMax: rainCfg.legacyLenMax,
        });
      } else {
        const rainLayerCount = Math.max(0, Math.min(2, rainCfg.layers));
        for (let layer = 0; layer < rainLayerCount; layer++) {
          const rainCount = Math.max(200, Math.floor(rainCfg.countPerLayer * (layer === 0 ? 1 : 0.72)));
          const spreadX = 360 + layer * 130;
          const spreadZ = 540 + layer * 180;
          const resetTop = 260 + layer * 80;
          const rainPos = new Float32Array(rainCount * 2 * 3);
          const rainSpd = new Float32Array(rainCount);
          for (let i = 0; i < rainCount; i++) {
            const x = (rnd() - 0.5) * spreadX;
            const y = 10 + rnd() * resetTop;
            const z = -30 - rnd() * spreadZ;
            const len = 0.9 + rnd() * (4.2 + layer * 1.2);
            rainPos[(i * 6) + 0] = x;
            rainPos[(i * 6) + 1] = y;
            rainPos[(i * 6) + 2] = z;
            rainPos[(i * 6) + 3] = x;
            rainPos[(i * 6) + 4] = y - len;
            rainPos[(i * 6) + 5] = z;
            rainSpd[i] = (34 + rnd() * 72) * (1 + layer * 0.24);
          }
          const rainGeo = new THREE.BufferGeometry();
          rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
          const rainMat = registerMaterial(new THREE.LineBasicMaterial({
            color: 0xbce7ff,
            transparent: true,
            opacity: layer === 0 ? 0.28 : 0.17,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }));
          const rain = new THREE.LineSegments(rainGeo, rainMat);
          const rainAnchor = new THREE.Group();
          rainAnchor.add(rain);
          world.add(rainAnchor);
          rainLayers.push({
            geo: rainGeo,
            spd: rainSpd,
            count: rainCount,
            anchor: rainAnchor,
            spreadX,
            spreadZ,
            resetTop,
            lenMax: 4.8,
          });
        }
      }

      const size = new THREE.Vector2();
      function resize() {
        const w = Math.max(1, window.innerWidth);
        const h = Math.max(1, window.innerHeight);
        renderer.getSize(size);
        if (size.x === w && size.y === h) return;
        renderer.setSize(w, h, false);
        composer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        bloom.setSize(w, h);
        const pxRatio = renderer.getPixelRatio();
        if (fxaaUniforms?.resolution?.value) {
          fxaaUniforms.resolution.value.set(1 / (w * pxRatio), 1 / (h * pxRatio));
        }
        if (sharpenUniforms?.resolution?.value) {
          sharpenUniforms.resolution.value.x = w;
          sharpenUniforms.resolution.value.y = h;
        }
      }

      const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        // Limited parallax range; no free 360 camera.
        pointer.tx = THREE.MathUtils.clamp(nx, -0.9, 0.9);
        pointer.ty = THREE.MathUtils.clamp(ny, -0.8, 0.8);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      let last = performance.now();
      const lookTmp = new THREE.Vector3();
      const tmpPos = new THREE.Vector3();
      const tmpNext = new THREE.Vector3();
      const tmpDir = new THREE.Vector3();
      const tmpColor = new THREE.Color();
      const tmpQuat = new THREE.Quaternion();
      const tmpRoll = new THREE.Quaternion();
      const carForward = new THREE.Vector3(1, 0, 0);

      const render = (now: number) => {
        if (disposed) return;
        resize();

        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const t = now * 0.001;

        pointer.x += (pointer.tx - pointer.x) * 0.045;
        pointer.y += (pointer.ty - pointer.y) * 0.045;

        const panX = pointer.x * 8.0;
        const panY = pointer.y * 4.8;
        camera.position.set(
          baseCam.x + (panX * 0.32),
          baseCam.y - (panY * 0.26),
          baseCam.z,
        );
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, cityGroundY + 140, cityGroundY + 236);
        lookTmp.set(
          lookTarget.x + (panX * 0.96),
          lookTarget.y - (panY * 0.84),
          lookTarget.z,
        );
        lookTmp.y = THREE.MathUtils.clamp(lookTmp.y, cityCenterPos.y + 90, cityCenterPos.y + 182);
        camera.lookAt(lookTmp);
        for (const rainLayer of rainLayers) {
          rainLayer.anchor.position.copy(camera.position);
        }

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.22);
        floorGlowMat.opacity = runtimeConfig.post.floorGlowBase + pulse * runtimeConfig.post.floorGlowAmp;
        laneMat.opacity = runtimeConfig.post.laneGlowBase + pulse * runtimeConfig.post.laneGlowAmp;
        skyGlowMat.opacity = 0.05 + (0.5 + 0.5 * Math.sin(t * 0.17)) * 0.06;

        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(tmpColor.setRGB(
            0.04 + pulse * 0.014,
            0.058 + pulse * 0.018,
            0.094 + pulse * 0.024,
          ));
        }

        if (!useLegacyTraffic && trafficCfg.enabled) {
          trafficSpawnTimer -= dt;
          while (trafficSpawnTimer <= 0) {
            spawnTrafficCar();
            trafficSpawnTimer += rand(trafficCfg.spawnMin, trafficCfg.spawnMax);
          }
        }

        for (const c of cars) {
          if (!c.active) continue;
          if (!useLegacyTraffic) c.u += dt * c.rate;
          else c.u = (c.u + dt * c.rate) % 1;
          c.phase += dt * 1.1;
          if (!useLegacyTraffic && c.u >= 1.02) {
            despawnTrafficCar(c);
            continue;
          }
          tmpPos.lerpVectors(c.start, c.end, c.u);
          tmpNext.lerpVectors(
            c.start,
            c.end,
            !useLegacyTraffic ? Math.min(1, c.u + 0.01) : (c.u + 0.01) % 1,
          );
          tmpDir.subVectors(tmpNext, tmpPos);
          const len = tmpDir.length();
          if (len > 1e-6) {
            tmpDir.multiplyScalar(1 / len);
            tmpQuat.setFromUnitVectors(carForward, tmpDir);
            tmpRoll.setFromAxisAngle(tmpDir, Math.sin(c.phase * 1.3) * 0.11);
            c.m.quaternion.copy(tmpQuat).multiply(tmpRoll);
          }
          c.m.position.set(tmpPos.x, tmpPos.y + Math.sin(c.phase) * c.bob, tmpPos.z);
        }

        for (const b of billboards) {
          const animated = b.animated;
          const flicker = billboardCfg.flicker ? (0.82 + 0.18 * Math.sin((t * 4.6) + b.phase)) : 1;
          const glitchPulse = billboardCfg.glitch && animated && Math.sin((t * 12.0) + b.phase) > 0.96 ? 0.45 : 0;
          b.material.emissiveIntensity = b.baseIntensity * flicker + glitchPulse;
          if (animated) {
            b.mesh.position.y = b.baseY + Math.sin((t * 0.85) + b.phase) * 1.3;
            b.mesh.rotation.z = Math.sin((t * 0.65) + b.phase) * 0.015;
          }
        }

        for (const layer of rainLayers) {
          const pos = layer.geo.getAttribute("position") as unknown as ThreeTypes.BufferAttribute;
          for (let i = 0; i < layer.count; i++) {
            const headY = pos.getY((i * 2) + 0);
            const spd = layer.spd[i] ?? 0;
            const nextY = headY - (spd * dt);
            if (nextY < -30) {
              const x = (rnd() - 0.5) * layer.spreadX;
              const y = 120 + rnd() * layer.resetTop;
              const z = -30 - rnd() * layer.spreadZ;
              const len = 0.9 + rnd() * layer.lenMax;
              pos.setXYZ((i * 2) + 0, x, y, z);
              pos.setXYZ((i * 2) + 1, x, y - len, z);
            } else {
              pos.setY((i * 2) + 0, nextY);
              pos.setY((i * 2) + 1, pos.getY((i * 2) + 1) - (spd * dt));
            }
          }
          pos.needsUpdate = true;
        }

        bloom.strength = runtimeConfig.post.bloomStrength;
        bloom.radius = runtimeConfig.post.bloomRadius;

        composer.render();
        raf = requestAnimationFrame(render);
      };
      reportProgress(0.98);
      resize();
      composer.render();
      markReady();
      raf = requestAnimationFrame(render);

      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(raf);

        (safeZonePass as any)?.material?.dispose?.();
        (sharpenPass as any)?.material?.dispose?.();
        (composer as any).dispose?.();
        composerRenderTarget.dispose();
        dracoLoader.dispose();
        ktx2Loader.dispose();
        renderer.dispose();

        const disposedGeometries = new Set<ThreeTypes.BufferGeometry>();
        const disposedMaterials = new Set<ThreeTypes.Material>();
        const disposeMaterial = (mat: ThreeTypes.Material) => {
          if (disposedMaterials.has(mat)) return;
          disposedMaterials.add(mat);
          const anyMat = mat as any;
          if (anyMat.map?.dispose) anyMat.map.dispose();
          if (anyMat.emissiveMap?.dispose) anyMat.emissiveMap.dispose();
          if (anyMat.alphaMap?.dispose) anyMat.alphaMap.dispose();
          if (anyMat.roughnessMap?.dispose) anyMat.roughnessMap.dispose();
          if (anyMat.metalnessMap?.dispose) anyMat.metalnessMap.dispose();
          mat.dispose?.();
        };

        scene.traverse((obj: ThreeTypes.Object3D) => {
          const anyObj = obj as any;
          if (anyObj.geometry && !disposedGeometries.has(anyObj.geometry)) {
            disposedGeometries.add(anyObj.geometry);
            anyObj.geometry.dispose?.();
          }
          if (anyObj.material) {
            const mats = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
            for (const m of mats) disposeMaterial(m);
          }
        });

        for (const tex of loadedTextures) tex.dispose();
        for (const m of sceneMaterials) disposeMaterial(m);
      };
    })().catch(() => {
      // Keep CSS fallback if loading fails.
      if (!disposed) onError?.();
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [enabled, reducedMotion, onError, onProgress, onReady]);

  if (!enabled || reducedMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`ax-orion${ready ? " is-ready" : ""}`}
      aria-hidden
    />
  );
}
