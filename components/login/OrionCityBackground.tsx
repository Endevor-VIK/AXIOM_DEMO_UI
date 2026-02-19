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
const BUILDING_USE_ORIGINAL = new Set<string>([
  "building7.glb",
  "building8.glb",
  "building9.glb",
  "building10.glb",
]);

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
  const width = 768;
  const height = 1536;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const g = c.getContext("2d");
  if (!g) return null;

  const colorSets = [
    ["#66f6ff", "#091425", "#ff5b8c", "#72c7ff"],
    ["#84ffd9", "#101d29", "#ffbd58", "#a8f5ff"],
    ["#81c7ff", "#111531", "#ff75ab", "#6dfff2"],
    ["#6effee", "#151235", "#ffd26d", "#85cbff"],
    ["#8dffff", "#141d30", "#ff5e82", "#cbfdff"],
    ["#9effd9", "#0d1f2b", "#ffd486", "#89cbff"],
  ];
  const palette = colorSets[idx % colorSets.length] ?? colorSets[0]!;
  const base = palette[0] ?? "#58f6ff";
  const dark = palette[1] ?? "#102030";
  const accent = palette[2] ?? "#ff4e7a";
  const alt = palette[3] ?? "#76d2ff";

  g.fillStyle = "#020409";
  g.fillRect(0, 0, width, height);

  const bg = g.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, `${dark}f2`);
  bg.addColorStop(0.4, "#08101df2");
  bg.addColorStop(1, "#04060bf5");
  g.fillStyle = bg;
  g.fillRect(0, 0, width, height);

  const halo = g.createRadialGradient(width * 0.5, height * 0.45, 10, width * 0.5, height * 0.45, height * 0.5);
  halo.addColorStop(0, `${accent}36`);
  halo.addColorStop(0.55, `${base}1a`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, width, height);

  g.strokeStyle = `${base}50`;
  g.lineWidth = 2;
  g.strokeRect(20, 20, width - 40, height - 40);
  g.strokeStyle = `${alt}44`;
  g.lineWidth = 1;
  for (let x = 28; x < width; x += 36) {
    g.beginPath();
    g.moveTo(x, 24);
    g.lineTo(x, height - 24);
    g.stroke();
  }
  for (let y = 28; y < height; y += 52) {
    g.beginPath();
    g.moveTo(24, y);
    g.lineTo(width - 24, y);
    g.stroke();
  }

  g.fillStyle = `${base}20`;
  g.fillRect(width * 0.18, 110, width * 0.64, height - 220);
  g.strokeStyle = `${accent}c0`;
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(width * 0.5, 80);
  g.lineTo(width * 0.5, height - 80);
  g.stroke();

  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 180; i++) {
    const x = rnd() * width;
    const y = rnd() * height;
    const w = 6 + rnd() * 42;
    const h = 2 + rnd() * 10;
    g.fillStyle = i % 7 === 0 ? `${accent}cc` : `${base}aa`;
    g.fillRect(x, y, w, h);
  }

  for (let i = 0; i < 30; i++) {
    const x = width * (0.22 + rnd() * 0.56);
    const y = 140 + rnd() * (height - 280);
    const w = 10 + rnd() * 26;
    const h = 24 + rnd() * 100;
    g.fillStyle = i % 3 === 0 ? `${accent}d8` : `${alt}d0`;
    g.fillRect(x, y, w, h);
  }

  g.globalCompositeOperation = "source-over";
  const panelGrad = g.createLinearGradient(width * 0.2, 0, width * 0.8, height);
  panelGrad.addColorStop(0, `${alt}1f`);
  panelGrad.addColorStop(0.5, `${accent}24`);
  panelGrad.addColorStop(1, `${base}18`);
  g.fillStyle = panelGrad;
  g.fillRect(width * 0.2, 110, width * 0.6, height - 220);

  g.fillStyle = `${base}f2`;
  g.font = "900 120px 'Rajdhani', 'Bank Gothic Medium BT', sans-serif";
  g.textAlign = "left";
  g.textBaseline = "middle";

  const labels = ["ORION", "AXIOM", "NEON", "NEXUS", "VECTOR", "AERO"];
  const label = labels[idx % labels.length] ?? "AXIOM";
  g.fillText(label, 72, 182);

  g.font = "700 42px 'Rajdhani', 'Bank Gothic Medium BT', sans-serif";
  g.fillStyle = `${accent}f2`;
  g.fillText("CITY SIGNAL GRID", 76, 258);

  g.font = "700 30px 'IBM Plex Mono', monospace";
  g.fillStyle = "#d8f9ff";
  g.fillText(`DISTRICT ${100 + (idx * 7)}`, 76, 324);
  g.fillText(`CHANNEL ${20 + idx} // LIVE`, 76, 368);
  g.fillText("NEON PROTOCOL", 76, 412);

  g.fillStyle = `${alt}f0`;
  g.font = "800 210px 'Rajdhani', sans-serif";
  g.fillText(`${(idx + 1) % 10}`, width * 0.3, height * 0.72);
  g.font = "700 34px 'IBM Plex Mono', monospace";
  g.fillStyle = `${accent}e8`;
  g.fillText(`NODE 0${idx + 1} // AD STREAM`, 76, height - 128);

  g.textAlign = "right";
  g.fillStyle = `${base}e6`;
  g.font = "700 32px 'IBM Plex Mono', monospace";
  g.fillText("VERTICAL FEED", width - 52, 92);
  g.textAlign = "left";

  g.globalCompositeOperation = "screen";
  const scan = g.createLinearGradient(0, 0, 0, height);
  scan.addColorStop(0, "rgba(255,255,255,0.0)");
  scan.addColorStop(0.5, "rgba(255,255,255,0.14)");
  scan.addColorStop(1, "rgba(255,255,255,0.0)");
  g.fillStyle = scan;
  g.fillRect(0, height * 0.22, width, height * 0.56);

  g.globalCompositeOperation = "overlay";
  g.fillStyle = "rgba(255,255,255,0.08)";
  for (let y = 0; y < height; y += 5) {
    g.fillRect(0, y, width, 1);
  }

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
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float midMask = smoothstep(0.05, 0.50, lum) * (1.0 - smoothstep(0.62, 0.94, lum));
        col += vec3(uLiftOutside * inner * midMask);
        col *= (1.0 - centerMask * uSafeDarken);
        gl_FragColor = vec4(col, src.a);
      }
    `,
  };
}

function createSoftCityLightShaderPassShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      strength: { value: 0.0 },
      contrast: { value: 0.0 },
      saturation: { value: 0.0 },
      highlightClamp: { value: 0.1 },
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
      uniform float strength;
      uniform float contrast;
      uniform float saturation;
      uniform float highlightClamp;
      varying vec2 vUv;

      void main() {
        vec4 src = texture2D(tDiffuse, vUv);
        vec3 col = src.rgb;
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        float shadowMask = 1.0 - smoothstep(0.08, 0.42, lum);
        float midMask = smoothstep(0.10, 0.52, lum) * (1.0 - smoothstep(0.60, 0.90, lum));
        float edge = distance(vUv, vec2(0.5, 0.55));
        float edgeVignette = 1.0 - smoothstep(0.28, 0.95, edge);
        vec3 coolShadow = vec3(0.070, 0.102, 0.138);
        vec3 neonTint = mix(vec3(0.050, 0.100, 0.135), vec3(0.100, 0.072, 0.145), vUv.x);

        col += coolShadow * (shadowMask * 0.72 * strength * edgeVignette);
        col += neonTint * (midMask * 0.36 * strength);
        col = (col - 0.5) * (1.0 + contrast) + 0.5;

        float gray = dot(col, vec3(0.299, 0.587, 0.114));
        col = mix(vec3(gray), col, 1.0 + saturation * 0.8);

        float peak = max(col.r, max(col.g, col.b));
        float hiMask = smoothstep(0.70, 1.00, peak);
        col -= vec3(hiMask * highlightClamp * strength);

        gl_FragColor = vec4(clamp(col, 0.0, 1.0), src.a);
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

      const softLightPass = runtimeConfig.post.softLightEnabled
        ? new ShaderPass(createSoftCityLightShaderPassShader() as any)
        : null;
      if (softLightPass) {
        const softUniforms = (softLightPass.material as any).uniforms;
        softUniforms.strength.value = runtimeConfig.post.softLightStrength;
        softUniforms.contrast.value = runtimeConfig.post.softLightContrast;
        softUniforms.saturation.value = runtimeConfig.post.softLightSaturation;
        softUniforms.highlightClamp.value = runtimeConfig.post.softLightHighlightClamp;
        composer.addPass(softLightPass);
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

      const qualityLightBoost = runtimeConfig.quality === "ultra" ? 1.08 : 1;
      const amb = new THREE.AmbientLight(0xffffff, 0.52 * qualityLightBoost);
      const hemi = new THREE.HemisphereLight(0x8bcfff, 0x120a11, 0.64 * qualityLightBoost);
      const key = new THREE.DirectionalLight(0xb5ddff, 0.74 * qualityLightBoost);
      key.position.set(32, 46, 20);
      const fill = new THREE.PointLight(0x44f7e0, 0.7 * qualityLightBoost, 350, 2);
      fill.position.set(-54, 34, -92);
      const rim = new THREE.PointLight(0xff517f, 0.52 * qualityLightBoost, 340, 2);
      rim.position.set(78, 26, -122);
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
      const query = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
      const diagEnabled = Boolean(query && (query.get("debug") === "1" || query.get("orionDiag") === "1"));
      const diagState: any = diagEnabled
        ? {
          quality: runtimeConfig.quality,
          seed: runtimeConfig.seed,
          media: {
            skyBackdropLoaded: false,
            videoAtlas: {
              requested: [] as string[],
              loaded: null as string | null,
              failed: [] as string[],
            },
          },
          buildings: {
            placed: 0,
            finalPlaced: 0,
            rejectedInCorridor: 0,
            rejectedNearCenter: 0,
            rejectedOverlap: 0,
            cleanedByOverlap: 0,
            ringAttempts: 0,
            distantAttempts: 0,
            overlapPairCount: 0,
            overlapPairs: [] as any[],
          },
          billboards: {
            requestedCount: runtimeConfig.billboards.count,
            animatedRequested: runtimeConfig.billboards.animatedCount,
            sourceCount: 0,
            orionCount: 0,
            customCount: 0,
            customSkippedOverlap: 0,
            animatedPlaced: 0,
            overlapPairCount: 0,
            overlapPairs: [] as any[],
            occludedByBuildings: 0,
            occludedSamples: [] as any[],
            videoSliceTypes: [] as any[],
          },
          issues: [] as string[],
        }
        : null;

      const loadedTextures = new Set<ThreeTypes.Texture>();
      const managedVideos: HTMLVideoElement[] = [];
      const srgbColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      const tuneTexture = (tex: ThreeTypes.Texture | null | undefined, isColor = false) => {
        if (!tex) return;
        tex.flipY = false;
        tex.anisotropy = textureAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        if (isColor) (tex as any).colorSpace = srgbColorSpace;
        tex.needsUpdate = true;
        loadedTextures.add(tex);
      };
      const textureLoader = new THREE.TextureLoader(loadingManager);
      const loadImageOptional = async (relativePath: string, isColor = false) => {
        try {
          const tex = await textureLoader.loadAsync(publicUrl(relativePath));
          tuneTexture(tex, isColor);
          return tex;
        } catch {
          return null;
        }
      };
      const loadVideoAtlasOptional = async (relativePath: string) => {
        if (diagState) diagState.media.videoAtlas.requested.push(relativePath);
        try {
          const video = document.createElement("video");
          video.src = publicUrl(relativePath);
          video.loop = true;
          video.muted = true;
          video.playsInline = true;
          video.preload = "auto";
          managedVideos.push(video);

          await new Promise<void>((resolve, reject) => {
            let done = false;
            let failReason = "video atlas load failed";
            const finish = (ok: boolean) => {
              if (done) return;
              done = true;
              window.clearTimeout(timer);
              video.removeEventListener("loadeddata", onLoadedData);
              video.removeEventListener("error", onError);
              if (ok) resolve();
              else reject(new Error(failReason));
            };
            const onLoadedData = () => finish(true);
            const onError = () => {
              const errCode = video.error?.code ?? "unknown";
              failReason = `video atlas error code ${String(errCode)}`;
              finish(false);
            };
            const timer = window.setTimeout(() => finish(true), 1800);
            video.addEventListener("loadeddata", onLoadedData);
            video.addEventListener("error", onError);
            video.load();
          });

          const tex = new THREE.VideoTexture(video);
          tex.generateMipmaps = false;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tuneTexture(tex, true);
          void video.play().catch(() => undefined);
          if (diagState && !diagState.media.videoAtlas.loaded) {
            diagState.media.videoAtlas.loaded = relativePath;
          }
          return tex;
        } catch (e) {
          if (diagState) {
            const reason = e instanceof Error ? e.message : "video atlas load failed";
            diagState.media.videoAtlas.failed.push(`${relativePath} :: ${reason}`);
          }
          return null;
        }
      };
      const loadKtx = async (name: string, isColor = false) => {
        const tex = await ktx2Loader.loadAsync(publicUrl(`assets/orion/original/high/${name}`));
        tuneTexture(tex, isColor);
        return tex;
      };
      const wantsAnimatedBillboards = runtimeConfig.billboards.enabled && runtimeConfig.billboards.animatedCount > 0;

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
        arcadeAtlasTex,
        skyHdr,
        skyBackdropTex,
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
        loadKtx("Arcade.ktx2", true),
        exrLoader.loadAsync(publicUrl("assets/orion/original/sky-512-HDR.exr")),
        loadImageOptional("assets/orion/original/sky4k-75.avif", true),
      ]);
      let billboardVideoAtlasTex: ThreeTypes.VideoTexture | null = null;
      if (wantsAnimatedBillboards) {
        const preferredPath = "assets/orion/original/video-atlas.mp4";
        billboardVideoAtlasTex = await loadVideoAtlasOptional(preferredPath);
        if (!billboardVideoAtlasTex) {
          if (diagState) diagState.issues.push("video_atlas_unavailable");
        }
      }

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

      let skyBackdropMat: ThreeTypes.MeshBasicMaterial | null = null;
      if (skyBackdropTex) {
        if (diagState) diagState.media.skyBackdropLoaded = true;
        skyBackdropMat = registerMaterial(new THREE.MeshBasicMaterial({
          map: skyBackdropTex,
          color: 0xffffff,
          transparent: true,
          opacity: 0.26,
          side: THREE.BackSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }));
        const skyBackdrop = new THREE.Mesh(new THREE.SphereGeometry(2140, 36, 28), skyBackdropMat);
        skyBackdrop.position.copy(skyDome.position);
        skyBackdrop.rotation.y = Math.PI * 0.24;
        world.add(skyBackdrop);
      }

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
        emissiveIntensity: 0.24,
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
        emissiveIntensity: 2.2 * readabilityBoost,
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
        emissiveIntensity: 2.2 * readabilityBoost,
        roughnessMap: set2RM,
        metalnessMap: set2RM,
        metalness: materialCfg.building.metalness,
        roughness: materialCfg.building.roughness,
        envMapIntensity: materialCfg.building.envMapIntensity,
        alphaTest: runtimeConfig.quality === "ultra"
          ? 0.08
          : Math.min(materialCfg.building.alphaTest, 0.2),
        transparent: false,
        side: THREE.DoubleSide,
      }));
      if ("alphaToCoverage" in (set2Mat as any)) {
        (set2Mat as any).alphaToCoverage = false;
      }

      const building4CustomMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Cars,
        emissiveMap: building4Decals,
        roughnessMap: set1RM,
        metalnessMap: set1RM,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 4.2 * readabilityBoost,
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
                // Guard against fallback-gray buildings: keep original only when it has real texture input.
                if (!mm.map && !mm.emissiveMap) {
                  originalMaterial = undefined;
                } else {
                  tuneTexture(mm.map ?? null, true);
                  tuneTexture(mm.emissiveMap ?? null, true);
                  tuneTexture(mm.roughnessMap ?? null, false);
                  tuneTexture(mm.metalnessMap ?? null, false);
                  const baseEmissive = Number(mm.emissiveIntensity || (mm.emissiveMap ? 1.15 : 0.75));
                  if (mm.emissiveMap) {
                    mm.emissive = new THREE.Color(0xffffff);
                    mm.emissiveIntensity = Math.min(2.6, Math.max(1.35, baseEmissive * 1.25));
                  } else {
                    mm.emissiveIntensity = Math.min(1.5, Math.max(0.8, baseEmissive));
                  }
                  mm.metalness = Math.min(0.16, Math.max(0.04, Number(mm.metalness ?? materialCfg.building.metalness)));
                  mm.roughness = Math.min(0.9, Math.max(0.64, Number(mm.roughness ?? materialCfg.building.roughness)));
                  mm.envMapIntensity = Math.max(Number(mm.envMapIntensity || 0), 0.16);
                }
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
      const buildingOccluders: ThreeTypes.Mesh[] = [];
      const buildingFootprints: Array<{
        name: string;
        mesh: ThreeTypes.Mesh;
        locked: boolean;
        x: number;
        z: number;
        halfX: number;
        halfZ: number;
      }> = [];
      const hardOverlapRatio = runtimeConfig.quality === "ultra" ? 0.32 : 0.36;
      const hardOverlapRadiusMul = runtimeConfig.quality === "ultra" ? 1.28 : 1.22;

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
        avoidHardOverlap?: boolean;
        lockFootprint?: boolean;
        recordRejects?: boolean;
      }): boolean => {
        const recordRejects = cfg.recordRejects !== false;
        if (!cfg.allowInCorridor && inViewCorridor(cfg.x, cfg.z)) {
          if (diagState && recordRejects) diagState.buildings.rejectedInCorridor += 1;
          return false;
        }
        if (!cfg.allowInCorridor) {
          const rel = new THREE.Vector2(cfg.x - baseCam.x, cfg.z - baseCam.z);
          const depth = rel.dot(viewDirXZ);
          const lateral = Math.abs(rel.dot(viewRightXZ));
          if (depth > -80 && depth < 840 && lateral < 760) {
            if (diagState && recordRejects) diagState.buildings.rejectedInCorridor += 1;
            return false;
          }
        }

        const asset = buildingAssets.get(cfg.name);
        const bounds = assetBounds.get(cfg.name);
        if (!asset || !bounds) return false;

        const material = pickBuildingMaterial(cfg.name, asset);
        const mesh = new THREE.Mesh(asset.geometry, material);

        const srcH = Math.max(1, bounds.max.y - bounds.min.y);
        const usesOriginalBaked = BUILDING_USE_ORIGINAL.has(cfg.name);
        const targetHeight = usesOriginalBaked ? Math.min(cfg.targetHeight, 520) : cfg.targetHeight;
        const baseScale = (targetHeight / srcH) * (cfg.scaleMul ?? 1);
        const sxRaw = baseScale * (cfg.stretchX ?? 1);
        const sy = baseScale;
        const szRaw = baseScale * (cfg.stretchZ ?? 1);
        const sx = usesOriginalBaked
          ? THREE.MathUtils.clamp(sxRaw, baseScale * 0.92, baseScale * 1.1)
          : sxRaw;
        const sz = usesOriginalBaked
          ? THREE.MathUtils.clamp(szRaw, baseScale * 0.92, baseScale * 1.1)
          : szRaw;
        const halfX = Math.max(1, (bounds.max.x - bounds.min.x) * sx * 0.5);
        const halfZ = Math.max(1, (bounds.max.z - bounds.min.z) * sz * 0.5);
        if (cfg.avoidHardOverlap !== false) {
          let hardOverlap = false;
          for (const b of buildingFootprints) {
            const minX = Math.max(cfg.x - halfX, b.x - b.halfX);
            const maxX = Math.min(cfg.x + halfX, b.x + b.halfX);
            const minZ = Math.max(cfg.z - halfZ, b.z - b.halfZ);
            const maxZ = Math.min(cfg.z + halfZ, b.z + b.halfZ);
            const ox = maxX - minX;
            const oz = maxZ - minZ;
            if (ox <= 0 || oz <= 0) continue;
            const overlapArea = ox * oz;
            const minArea = Math.min((halfX * 2) * (halfZ * 2), (b.halfX * 2) * (b.halfZ * 2));
            const ratio = overlapArea / Math.max(1, minArea);
            const dist = Math.hypot(cfg.x - b.x, cfg.z - b.z);
            const overlapRadius = Math.max(halfX, halfZ, b.halfX, b.halfZ) * hardOverlapRadiusMul;
            if (ratio > hardOverlapRatio && dist < overlapRadius) {
              hardOverlap = true;
              break;
            }
          }
          if (hardOverlap) {
            if (diagState && recordRejects) diagState.buildings.rejectedOverlap += 1;
            return false;
          }
        }

        mesh.scale.set(sx, sy, sz);
        mesh.rotation.y = cfg.yaw;
        mesh.position.set(cfg.x, cfg.groundY - (bounds.min.y * sy), cfg.z);
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        world.add(mesh);
        buildingOccluders.push(mesh);

        buildingFootprints.push({
          name: cfg.name,
          mesh,
          locked: cfg.lockFootprint === true,
          x: mesh.position.x,
          z: mesh.position.z,
          halfX,
          halfZ,
        });
        if (diagState) diagState.buildings.placed += 1;
        return true;
      };
      const placeBuildingWithRetries = (
        cfg: {
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
          avoidHardOverlap?: boolean;
          lockFootprint?: boolean;
        },
        retries: number,
        jitterRadius: number,
      ): boolean => {
        const total = Math.max(1, retries);
        for (let attempt = 0; attempt < total; attempt++) {
          const isLast = attempt === total - 1;
          const spread = attempt === 0 ? 0 : jitterRadius * ((attempt + 1) / total);
          const placed = placeBuilding({
            ...cfg,
            x: cfg.x + (spread > 0 ? rand(-spread, spread) : 0),
            z: cfg.z + (spread > 0 ? rand(-spread, spread) : 0),
            yaw: cfg.yaw + (attempt === 0 ? 0 : rand(-0.18, 0.18)),
            recordRejects: isLast,
          });
          if (placed) return true;
        }
        return false;
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
          avoidHardOverlap: false,
          lockFootprint: true,
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
      if (diagState) {
        diagState.layout = {
          profile: "ovp_p1_rings_v1",
          hardOverlapRatio,
          hardOverlapRadiusMul,
          ringCount: rings.length,
          rings: rings.map((r) => ({
            radius: r.radius,
            count: r.count,
            minH: r.minH,
            maxH: r.maxH,
            jitter: r.jitter,
          })),
          foregroundRange: { min: -14, max: 14, step: 50 },
          distantWallCount: 96,
        };
      }

      for (const ring of rings) {
        const offset = rand(0, Math.PI * 2);
        for (let i = 0; i < ring.count; i++) {
          if (diagState) diagState.buildings.ringAttempts += 1;
          const a = offset + (i / ring.count) * Math.PI * 2;
          const x = centerX + Math.cos(a) * ring.radius + rand(-ring.jitter, ring.jitter);
          const z = centerZ + Math.sin(a) * ring.radius + rand(-ring.jitter, ring.jitter);

          // Keep the immediate center cleaner for login readability.
          const nearCenter = Math.abs(x - centerX) < 260 && Math.abs(z - centerZ) < 340;
          if (nearCenter && ring.radius <= 640) {
            if (diagState) diagState.buildings.rejectedNearCenter += 1;
            continue;
          }

          const name = pickName();
          placeBuildingWithRetries({
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
          }, 4, 42);
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
          placeBuildingWithRetries({
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
          }, 5, 58);
        }
      }

      // Distant skyline wall to avoid visible black bands on ultra-wide monitors.
      for (let i = 0; i < 96; i++) {
        if (diagState) diagState.buildings.distantAttempts += 1;
        const a = rand(-Math.PI, Math.PI);
        const radius = rand(950, 1400);
        const x = centerX + Math.cos(a) * radius;
        const z = centerZ + Math.sin(a) * radius;
        placeBuildingWithRetries({
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
        }, 4, 90);
      }

      const cleanupOverlapThreshold = runtimeConfig.quality === "ultra" ? 0.27 : 0.32;
      const cleanupMaxRemovals = runtimeConfig.quality === "ultra" ? 20 : 14;
      let cleanedByOverlap = 0;
      const removeFootprint = (target: {
        mesh: ThreeTypes.Mesh;
      }) => {
        const idxOccluder = buildingOccluders.indexOf(target.mesh);
        if (idxOccluder >= 0) buildingOccluders.splice(idxOccluder, 1);
        world.remove(target.mesh);
      };
      while (cleanedByOverlap < cleanupMaxRemovals && buildingFootprints.length > 1) {
        let worst:
          | {
            aIndex: number;
            bIndex: number;
            ratio: number;
          }
          | null = null;
        for (let i = 0; i < buildingFootprints.length; i++) {
          const a = buildingFootprints[i];
          if (!a) continue;
          for (let j = i + 1; j < buildingFootprints.length; j++) {
            const b = buildingFootprints[j];
            if (!b) continue;
            const minX = Math.max(a.x - a.halfX, b.x - b.halfX);
            const maxX = Math.min(a.x + a.halfX, b.x + b.halfX);
            const minZ = Math.max(a.z - a.halfZ, b.z - b.halfZ);
            const maxZ = Math.min(a.z + a.halfZ, b.z + b.halfZ);
            const ox = maxX - minX;
            const oz = maxZ - minZ;
            if (ox <= 0 || oz <= 0) continue;
            const overlapArea = ox * oz;
            const aArea = (a.halfX * 2) * (a.halfZ * 2);
            const bArea = (b.halfX * 2) * (b.halfZ * 2);
            const ratio = overlapArea / Math.max(1, Math.min(aArea, bArea));
            if (ratio < cleanupOverlapThreshold) continue;
            if (!worst || ratio > worst.ratio) {
              worst = { aIndex: i, bIndex: j, ratio };
            }
          }
        }
        if (!worst) break;
        const a = buildingFootprints[worst.aIndex];
        const b = buildingFootprints[worst.bIndex];
        if (!a || !b) break;
        if (a.locked && b.locked) break;

        const score = (fp: typeof a) => {
          if (fp.locked) return Number.NEGATIVE_INFINITY;
          const area = (fp.halfX * 2) * (fp.halfZ * 2);
          const centerDist = Math.hypot(fp.x - centerX, fp.z - centerZ);
          return centerDist + (area * 0.0022);
        };
        const removeA = score(a) >= score(b);
        const victimIndex = removeA ? worst.aIndex : worst.bIndex;
        const victim = buildingFootprints[victimIndex];
        if (!victim) break;
        removeFootprint(victim);
        buildingFootprints.splice(victimIndex, 1);
        cleanedByOverlap += 1;
      }
      if (diagState) {
        diagState.layout.cleanupOverlapThreshold = cleanupOverlapThreshold;
        diagState.layout.cleanupMaxRemovals = cleanupMaxRemovals;
        diagState.buildings.cleanedByOverlap = cleanedByOverlap;
        diagState.buildings.finalPlaced = buildingFootprints.length;
      }

      if (diagState && buildingFootprints.length > 1) {
        const overlaps: Array<{
          a: string;
          b: string;
          ratio: number;
          distance: number;
        }> = [];
        for (let i = 0; i < buildingFootprints.length; i++) {
          const a = buildingFootprints[i];
          if (!a) continue;
          for (let j = i + 1; j < buildingFootprints.length; j++) {
            const b = buildingFootprints[j];
            if (!b) continue;
            const minX = Math.max(a.x - a.halfX, b.x - b.halfX);
            const maxX = Math.min(a.x + a.halfX, b.x + b.halfX);
            const minZ = Math.max(a.z - a.halfZ, b.z - b.halfZ);
            const maxZ = Math.min(a.z + a.halfZ, b.z + b.halfZ);
            const ox = maxX - minX;
            const oz = maxZ - minZ;
            if (ox <= 0 || oz <= 0) continue;

            const overlapArea = ox * oz;
            const aArea = (a.halfX * 2) * (a.halfZ * 2);
            const bArea = (b.halfX * 2) * (b.halfZ * 2);
            const ratio = overlapArea / Math.max(1, Math.min(aArea, bArea));
            if (ratio < 0.22) continue;

            overlaps.push({
              a: a.name,
              b: b.name,
              ratio: Number(ratio.toFixed(3)),
              distance: Number(Math.hypot(a.x - b.x, a.z - b.z).toFixed(1)),
            });
          }
        }
        overlaps.sort((x, y) => y.ratio - x.ratio);
        diagState.buildings.overlapPairCount = overlaps.length;
        diagState.buildings.overlapPairs = overlaps.slice(0, 12);
        if (overlaps.length > 0) diagState.issues.push("building_footprint_overlap");
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
        material: ThreeTypes.MeshStandardMaterial;
        baseIntensity: number;
        phase: number;
        flickerScale: number;
      };
      const billboardActors: BillboardActor[] = [];
      type BillboardPlacement = {
        mesh: ThreeTypes.Mesh;
        layer: "source" | "orion" | "custom";
        slot?: string;
        animated: boolean;
        x: number;
        y: number;
        z: number;
        w: number;
        h: number;
      };
      const billboardPlacements: BillboardPlacement[] = [];
      const registerBillboardPlacement = (
        mesh: ThreeTypes.Mesh,
        cfg: {
          layer: "source" | "orion" | "custom";
          slot?: string;
          animated: boolean;
          w: number;
          h: number;
        },
      ) => {
        const p = mesh.position;
        billboardPlacements.push({
          mesh,
          layer: cfg.layer,
          animated: cfg.animated,
          x: p.x,
          y: p.y,
          z: p.z,
          w: cfg.w,
          h: cfg.h,
          ...(cfg.slot ? { slot: cfg.slot } : {}),
        });
        if (diagState) {
          if (cfg.layer === "source") diagState.billboards.sourceCount += 1;
          if (cfg.layer === "orion") diagState.billboards.orionCount += 1;
          if (cfg.layer === "custom") diagState.billboards.customCount += 1;
          if (cfg.animated) diagState.billboards.animatedPlaced += 1;
        }
      };
      const overlapsPlacedBillboards = (x: number, y: number, z: number, w: number, h: number, padding = 10) => billboardPlacements.some((b) => {
        const distXZ = Math.hypot(x - b.x, z - b.z);
        const minDist = (((w + b.w) * 0.5) * 0.82) + padding;
        const verticalOk = Math.abs(y - b.y) < ((h + b.h) * 0.28);
        return distXZ < minDist && verticalOk;
      });
      const estimateBillboardSize = (mesh: ThreeTypes.Mesh, fallbackW: number, fallbackH: number) => {
        const geom = mesh.geometry as ThreeTypes.BufferGeometry | undefined;
        if (!geom) return { w: fallbackW, h: fallbackH };
        if (!geom.boundingBox) geom.computeBoundingBox();
        if (!geom.boundingBox) return { w: fallbackW, h: fallbackH };
        const size = new THREE.Vector3();
        geom.boundingBox.getSize(size);
        return {
          w: Math.max(1, Math.abs(size.x * mesh.scale.x)),
          h: Math.max(1, Math.abs(size.y * mesh.scale.y)),
        };
      };
      const billboardCfg = runtimeConfig.billboards;
      if (billboardCfg.enabled) {
        // Orion atlas slots reused by both source and custom skyline billboards.
        type OrionAtlasSlot = "A" | "B" | "C" | "D";
        const sourceUV: Record<OrionAtlasSlot, ThreeTypes.Vector2> = {
          A: new THREE.Vector2(0, 0),
          B: new THREE.Vector2(0.5, 0),
          C: new THREE.Vector2(0, 0.5),
          D: new THREE.Vector2(0.5, 0.5),
        };
        const sourceBrightness: Record<OrionAtlasSlot, number> = {
          A: 1,
          B: 0.7,
          C: 0.45,
          D: 0.62,
        };
        const createAtlasSlice = (
          baseTex: ThreeTypes.Texture,
          slot: OrionAtlasSlot,
        ) => {
          const uv = sourceUV[slot];
          const map = baseTex.clone();
          map.flipY = false;
          map.anisotropy = textureAniso;
          map.wrapS = THREE.ClampToEdgeWrapping;
          map.wrapT = THREE.ClampToEdgeWrapping;
          map.repeat.set(0.5, 0.5);
          map.offset.copy(uv);
          map.minFilter = (baseTex as any).isVideoTexture
            ? THREE.LinearFilter
            : THREE.LinearMipmapLinearFilter;
          map.magFilter = THREE.LinearFilter;
          map.generateMipmaps = !(baseTex as any).isVideoTexture;
          (map as any).colorSpace = (baseTex as any).colorSpace ?? (map as any).colorSpace;
          map.needsUpdate = true;
          loadedTextures.add(map);
          if (diagState && (baseTex as any).isVideoTexture) {
            diagState.billboards.videoSliceTypes.push({
              slot,
              ctor: map.constructor?.name ?? "UnknownTexture",
              isVideoTexture: Boolean((map as any).isVideoTexture),
            });
          }
          return map;
        };
        const createAtlasMaterial = (
          slot: OrionAtlasSlot,
          intensityMul: number,
          alphaTest: number,
        ) => {
          const map = createAtlasSlice(arcadeAtlasTex, slot);

          const brightness = sourceBrightness[slot] ?? 1;
          const mat = registerMaterial(new THREE.MeshStandardMaterial({
            map,
            emissiveMap: map,
            color: 0xffffff,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: (0.72 + brightness * 0.26) * readabilityBoost * intensityMul,
            roughness: 0.44,
            metalness: 0.12,
            transparent: true,
            opacity: 0.94,
            alphaTest,
            depthWrite: false,
            side: THREE.DoubleSide,
          }));
          mat.polygonOffset = true;
          mat.polygonOffsetFactor = -1;
          mat.polygonOffsetUnits = -2;
          return mat;
        };
        const orientBillboard = (mesh: ThreeTypes.Mesh, yaw: number) => {
          const nX = Math.sin(yaw);
          const nZ = Math.cos(yaw);
          mesh.rotation.y = yaw;
          const toCamX = baseCam.x - mesh.position.x;
          const toCamZ = baseCam.z - mesh.position.z;
          if ((nX * toCamX) + (nZ * toCamZ) < 0) mesh.rotation.y += Math.PI;
        };

        // Original Orion arcade billboards (kept as source layer).
        const arcadeTemplate = level.getObjectByName("Arcade-Screen") as ThreeTypes.Mesh | null;
        const arcadeAnchorA = level.getObjectByName("Arcade-Instance-A");
        if (arcadeTemplate && (arcadeTemplate as any).isMesh && arcadeAnchorA) {
          const sourceGroup = new THREE.Group();
          world.add(sourceGroup);
          const invAnchorA = new THREE.Matrix4().copy(arcadeAnchorA.matrixWorld).invert();
          const templateLocalFromA = new THREE.Matrix4().multiplyMatrices(invAnchorA, arcadeTemplate.matrixWorld);

          for (const slot of ["A", "B", "C", "D"] as OrionAtlasSlot[]) {
            const anchor = level.getObjectByName(`Arcade-Instance-${slot}`);
            if (!anchor) continue;
            const mat = createAtlasMaterial(slot, 0.9, 0.05);

            let mesh: ThreeTypes.Mesh;
            if (slot === "A") {
              mesh = arcadeTemplate;
              (mesh as any).material = mat;
            } else {
              mesh = arcadeTemplate.clone() as ThreeTypes.Mesh;
              (mesh as any).material = mat;
              mesh.name = `Arcade-${slot}-Screen`;
              const screenWorld = new THREE.Matrix4().multiplyMatrices(anchor.matrixWorld, templateLocalFromA);
              screenWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
              sourceGroup.add(mesh);
            }
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 7;
            const size = estimateBillboardSize(mesh, 36, 220);
            registerBillboardPlacement(mesh, {
              layer: "source",
              slot,
              animated: false,
              w: size.w,
              h: size.h,
            });

            billboardActors.push({
              material: mat,
              baseIntensity: mat.emissiveIntensity,
              phase: rnd() * Math.PI * 2,
              flickerScale: 0.01 + rnd() * 0.008,
            });
          }
        }

        // Orion skyline billboards: larger, static, clearly visible in login composition.
        const orionGroup = new THREE.Group();
        world.add(orionGroup);
        const orionAnchors: Array<{
          x: number; y: number; z: number; yaw: number; w: number; h: number; offset: number; slot: OrionAtlasSlot;
        }> = [
          { x: centerX - 642, y: cityGroundY + 194, z: centerZ - 216, yaw: 0.47, w: 66, h: 340, offset: 60, slot: "A" },
          { x: centerX + 650, y: cityGroundY + 188, z: centerZ - 210, yaw: -0.46, w: 64, h: 332, offset: 60, slot: "B" },
          { x: centerX - 724, y: cityGroundY + 260, z: centerZ - 378, yaw: 0.53, w: 58, h: 312, offset: 56, slot: "C" },
          { x: centerX + 734, y: cityGroundY + 252, z: centerZ - 368, yaw: -0.51, w: 56, h: 302, offset: 56, slot: "D" },
        ];
        for (const a of orionAnchors) {
          const mat = createAtlasMaterial(a.slot, 1.22, 0.035);
          const mesh = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), mat);
          const nX = Math.sin(a.yaw);
          const nZ = Math.cos(a.yaw);
          mesh.position.set(
            a.x + (nX * a.offset),
            a.y,
            a.z + (nZ * a.offset),
          );
          orientBillboard(mesh, a.yaw);
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.renderOrder = 8;
          orionGroup.add(mesh);
          registerBillboardPlacement(mesh, {
            layer: "orion",
            slot: a.slot,
            animated: false,
            w: a.w,
            h: a.h,
          });

          billboardActors.push({
            material: mat,
            baseIntensity: mat.emissiveIntensity,
            phase: rnd() * Math.PI * 2,
            flickerScale: 0.012 + rnd() * 0.01,
          });
        }

        // Custom billboard layer.
        if (billboardCfg.count > 0) {
          const billboardGroup = new THREE.Group();
          world.add(billboardGroup);

          const anchors = [
            { x: centerX - 652, y: cityGroundY + 196, z: centerZ - 226, yaw: 0.47, w: 46, h: 332, offset: 64 },
            { x: centerX + 658, y: cityGroundY + 190, z: centerZ - 220, yaw: -0.46, w: 44, h: 324, offset: 64 },
            { x: centerX - 732, y: cityGroundY + 260, z: centerZ - 386, yaw: 0.53, w: 40, h: 300, offset: 60 },
            { x: centerX + 740, y: cityGroundY + 254, z: centerZ - 374, yaw: -0.51, w: 38, h: 292, offset: 60 },
            { x: centerX - 804, y: cityGroundY + 322, z: centerZ - 572, yaw: 0.58, w: 34, h: 272, offset: 56 },
            { x: centerX + 816, y: cityGroundY + 318, z: centerZ - 560, yaw: -0.57, w: 34, h: 268, offset: 56 },
            { x: centerX - 928, y: cityGroundY + 234, z: centerZ - 296, yaw: 0.63, w: 44, h: 306, offset: 70 },
            { x: centerX + 938, y: cityGroundY + 228, z: centerZ - 292, yaw: -0.62, w: 42, h: 300, offset: 70 },
            { x: centerX - 998, y: cityGroundY + 286, z: centerZ - 512, yaw: 0.67, w: 36, h: 280, offset: 64 },
            { x: centerX + 1008, y: cityGroundY + 280, z: centerZ - 504, yaw: -0.66, w: 36, h: 276, offset: 64 },
          ];
          const targetCount = Math.min(billboardCfg.count, anchors.length);
          const animatedCount = Math.min(targetCount, Math.max(0, billboardCfg.animatedCount));
          const animatedSlots: OrionAtlasSlot[] = ["A", "B", "C", "D"];
          let placed = 0;
          let animatedPlaced = 0;

          for (let i = 0; i < anchors.length; i++) {
            if (placed >= targetCount) break;
            const a = anchors[i];
            if (!a) continue;
            const nX = Math.sin(a.yaw);
            const nZ = Math.cos(a.yaw);
            const posX = a.x + (nX * a.offset);
            const posZ = a.z + (nZ * a.offset);
            if (overlapsPlacedBillboards(posX, a.y, posZ, a.w, a.h, 14)) {
              if (diagState) diagState.billboards.customSkippedOverlap += 1;
              continue;
            }

            let tex: ThreeTypes.Texture | null = null;
            const shouldAnimate = Boolean(billboardVideoAtlasTex && animatedPlaced < animatedCount);
            const animatedSlot = animatedSlots[animatedPlaced % animatedSlots.length] ?? "A";
            if (shouldAnimate && billboardVideoAtlasTex) {
              const slot = animatedSlot;
              tex = createAtlasSlice(billboardVideoAtlasTex, slot);
            } else {
              tex = createBillboardTexture(THREE, placed, rnd);
            }
            if (!tex) continue;
            if (!(tex as any).isVideoTexture) {
              tex.flipY = false;
              tex.anisotropy = textureAniso;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              tex.needsUpdate = true;
              loadedTextures.add(tex);
            }

            const mat = registerMaterial(new THREE.MeshStandardMaterial({
              map: tex,
              emissiveMap: tex,
              color: 0xffffff,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 0.72 + rnd() * 0.16,
              roughness: 0.48,
              metalness: 0.09,
              transparent: true,
              opacity: 0.9,
              alphaTest: 0.05,
              depthWrite: false,
              side: THREE.DoubleSide,
            }));
            mat.polygonOffset = true;
            mat.polygonOffsetFactor = -1;
            mat.polygonOffsetUnits = -1;

            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(a.w, a.h), mat);
            mesh.position.set(
              posX,
              a.y,
              posZ,
            );
            orientBillboard(mesh, a.yaw);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 9;
            billboardGroup.add(mesh);
            registerBillboardPlacement(mesh, {
              layer: "custom",
              animated: shouldAnimate,
              w: a.w,
              h: a.h,
              ...(shouldAnimate ? { slot: animatedSlot } : {}),
            });
            if (shouldAnimate) animatedPlaced += 1;
            placed += 1;

            billboardActors.push({
              material: mat,
              baseIntensity: mat.emissiveIntensity,
              phase: rnd() * Math.PI * 2,
              flickerScale: 0.014 + rnd() * 0.012,
            });
          }
        }
      }

      if (diagState && billboardPlacements.length > 1) {
        const overlaps: Array<{
          a: string;
          b: string;
          dist: number;
          dy: number;
        }> = [];
        for (let i = 0; i < billboardPlacements.length; i++) {
          const a = billboardPlacements[i];
          if (!a) continue;
          for (let j = i + 1; j < billboardPlacements.length; j++) {
            const b = billboardPlacements[j];
            if (!b) continue;
            const dist = Math.hypot(a.x - b.x, a.z - b.z);
            const minDist = ((a.w + b.w) * 0.5) * 0.86;
            const dy = Math.abs(a.y - b.y);
            if (dist < minDist && dy < ((a.h + b.h) * 0.25)) {
              overlaps.push({
                a: `${a.layer}:${a.slot ?? "-"}`,
                b: `${b.layer}:${b.slot ?? "-"}`,
                dist: Number(dist.toFixed(1)),
                dy: Number(dy.toFixed(1)),
              });
            }
          }
        }
        diagState.billboards.overlapPairCount = overlaps.length;
        diagState.billboards.overlapPairs = overlaps.slice(0, 12);
        if (overlaps.length > 0) diagState.issues.push("billboard_overlap");

        const occluded: Array<{ layer: string; slot?: string; blockerDist: number }> = [];
        const raycaster = new THREE.Raycaster();
        const dir = new THREE.Vector3();
        for (const b of billboardPlacements) {
          dir.set(b.x - baseCam.x, b.y - baseCam.y, b.z - baseCam.z);
          const dist = dir.length();
          if (dist <= 1e-3) continue;
          dir.multiplyScalar(1 / dist);
          raycaster.set(baseCam, dir);
          raycaster.near = 0;
          raycaster.far = Math.max(0, dist - 8);
          const hits = raycaster.intersectObjects(buildingOccluders, false);
          if (hits.length > 0) {
            const blockerDist = hits[0]?.distance ?? dist;
            occluded.push({
              layer: b.layer,
              blockerDist: Number(blockerDist.toFixed(1)),
              ...(b.slot ? { slot: b.slot } : {}),
            });
          }
        }
        diagState.billboards.occludedByBuildings = occluded.length;
        diagState.billboards.occludedSamples = occluded.slice(0, 12);
        if (occluded.length > 0) diagState.issues.push("billboard_occluded");
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

      if (diagState) {
        diagState.generatedAt = new Date().toISOString();
        (window as any).__AX_ORION_DIAG__ = diagState;
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
        skyGlowMat.opacity = 0.045 + (0.5 + 0.5 * Math.sin(t * 0.17)) * 0.045;
        if (skyBackdropMat) {
          skyBackdropMat.opacity = 0.2 + (0.5 + 0.5 * Math.sin(t * 0.09)) * 0.1;
        }

        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(tmpColor.setRGB(
            0.05 + pulse * 0.016,
            0.072 + pulse * 0.02,
            0.112 + pulse * 0.028,
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

        for (const b of billboardActors) {
          const flicker = billboardCfg.flicker ? (1 + Math.sin((t * 1.9) + b.phase) * b.flickerScale) : 1;
          b.material.emissiveIntensity = b.baseIntensity * flicker;
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
        (softLightPass as any)?.material?.dispose?.();
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
        for (const video of managedVideos) {
          try {
            video.pause();
            video.removeAttribute("src");
            video.load();
          } catch {
            // no-op
          }
        }
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
