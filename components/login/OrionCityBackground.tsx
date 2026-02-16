import React, { useEffect, useRef, useState } from "react";
import type * as ThreeTypes from "three";

type OrionCityBackgroundProps = {
  enabled: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onError?: () => void;
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

export function OrionCityBackground({
  enabled,
  reducedMotion,
  onReady,
  onError,
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

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};
    let sentReady = false;

    const markReady = () => {
      if (disposed || sentReady) return;
      sentReady = true;
      setReady(true);
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
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x070d18, 0.00062);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 3200);
      camera.position.set(0, 200, 632);
      scene.add(camera);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.84, 0.2);
      composer.addPass(bloom);
      const fxaaPass = new ShaderPass(FXAAShader);
      composer.addPass(fxaaPass);
      const fxaaUniforms = (fxaaPass.material as any).uniforms;

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

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(publicUrl("draco/gltf/"));
      dracoLoader.setDecoderConfig({ type: "js" });

      const ktx2Loader = new KTX2Loader();
      ktx2Loader.setTranscoderPath(publicUrl("basis/"));
      ktx2Loader.detectSupport(renderer);

      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);
      gltfLoader.setKTX2Loader(ktx2Loader);

      const exrLoader = new EXRLoader();
      const maxAnisotropy = Math.max(1, renderer.capabilities.getMaxAnisotropy());
      const rnd = createSeededRandom(0x0badc0de);
      const rand = (min: number, max: number) => min + rnd() * (max - min);

      const loadedTextures = new Set<ThreeTypes.Texture>();
      const loadKtx = async (name: string, isColor = false) => {
        const tex = await ktx2Loader.loadAsync(publicUrl(`assets/orion/original/high/${name}`));
        tex.flipY = false;
        tex.anisotropy = Math.min(16, maxAnisotropy);
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
      skyHdr.anisotropy = Math.min(12, maxAnisotropy);
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
        gridTex.anisotropy = Math.min(10, maxAnisotropy);
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
        floorGlowTex.anisotropy = Math.min(4, maxAnisotropy);
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

      const laneCount = 5;
      const laneGeo = new THREE.PlaneGeometry(16, 1700);
      const laneMat = registerMaterial(new THREE.MeshBasicMaterial({
        color: 0x41ffe6,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      const laneGroup = new THREE.Group();
      for (let i = 0; i < laneCount; i++) {
        const lane = new THREE.Mesh(laneGeo, laneMat);
        const t = i - (laneCount - 1) * 0.5;
        lane.position.set(centerX + (t * 84), cityGroundY - 0.15, centerZ - 320);
        lane.rotation.x = -Math.PI / 2;
        laneGroup.add(lane);
      }
      world.add(laneGroup);

      const set1Mat = registerMaterial(new THREE.MeshStandardMaterial({
        map: set1Diffuse,
        emissiveMap: set1Emission,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.95,
        roughnessMap: set1RM,
        metalnessMap: set1RM,
        metalness: 0.6,
        roughness: 0.45,
        side: THREE.DoubleSide,
      }));

      const set2Mat = registerMaterial(new THREE.MeshStandardMaterial({
        map: set2Diffuse,
        emissiveMap: set2Emission,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.95,
        roughnessMap: set2RM,
        metalnessMap: set2RM,
        metalness: 0.6,
        roughness: 0.45,
        alphaTest: 0.5,
        transparent: false,
        side: THREE.DoubleSide,
      }));

      const building4CustomMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Cars,
        emissiveMap: building4Decals,
        roughnessMap: set1RM,
        metalnessMap: set1RM,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 2.5,
        metalness: 0.68,
        roughness: 0.42,
        side: THREE.DoubleSide,
      }));

      const mainMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: mainDiffuse,
        emissiveMap: mainDiffuse,
        alphaMap: mainAlpha,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.85,
        metalness: 0.05,
        roughness: 0.88,
        alphaTest: 0.5,
        transparent: false,
        side: THREE.DoubleSide,
      }));

      const animatedSolidMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Cars,
        emissiveMap: building4Cars,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.92,
        metalness: 0.3,
        roughness: 0.6,
        side: THREE.DoubleSide,
      }));

      const animatedTransparentMat = registerMaterial(new THREE.MeshStandardMaterial({
        map: building4Decals,
        emissiveMap: building4Decals,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.22,
        alphaTest: 0.1,
        transparent: false,
        side: THREE.DoubleSide,
      }));

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
          mesh.material = animatedTransparentMat;
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

      // Air traffic.
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
        start: ThreeTypes.Vector3;
        end: ThreeTypes.Vector3;
        u: number;
        rate: number;
        phase: number;
        bob: number;
      };

      const traffic = new THREE.Group();
      world.add(traffic);
      const cars: TrafficCar[] = [];

      const paths: { start: ThreeTypes.Vector3; end: ThreeTypes.Vector3 }[] = [];
      for (let i = 1; i <= 6; i++) {
        const s = level.getObjectByName(`air-traffic-${i}-start`);
        const e = level.getObjectByName(`air-traffic-${i}-end`);
        if (!s || !e) continue;
        const start = new THREE.Vector3();
        const end = new THREE.Vector3();
        s.getWorldPosition(start);
        e.getWorldPosition(end);
        paths.push({ start, end });
      }

      for (let i = 0; i < Math.min(paths.length, 6); i++) {
        const path = paths[i]!;
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

        m.scale.setScalar(0.9 + rnd() * 0.32);
        traffic.add(m);
        cars.push({
          m,
          start: path.start.clone(),
          end: path.end.clone(),
          u: rnd(),
          rate: 0.033 + rnd() * 0.035,
          phase: rnd() * Math.PI * 2,
          bob: 0.7 + rnd() * 1.3,
        });
      }

      // Rain.
      const rainCount = 1500;
      const rainPos = new Float32Array(rainCount * 2 * 3);
      const rainSpd = new Float32Array(rainCount);
      for (let i = 0; i < rainCount; i++) {
        const x = (rnd() - 0.5) * 360;
        const y = 10 + rnd() * 280;
        const z = -30 - rnd() * 540;
        const len = 0.9 + rnd() * 4.4;
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
        fxaaUniforms.resolution.value.set(1 / (w * pxRatio), 1 / (h * pxRatio));
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

        pointer.x += (pointer.tx - pointer.x) * 0.074;
        pointer.y += (pointer.ty - pointer.y) * 0.074;

        const panX = pointer.x * 17.2;
        const panY = pointer.y * 10.4;
        camera.position.set(
          baseCam.x + (panX * 0.51),
          baseCam.y - (panY * 0.42),
          baseCam.z + (Math.abs(panX) * 0.09),
        );
        camera.position.y = THREE.MathUtils.clamp(camera.position.y, cityGroundY + 140, cityGroundY + 236);
        lookTmp.set(
          lookTarget.x + (panX * 1.82),
          lookTarget.y - (panY * 1.56),
          lookTarget.z + (panX * 0.24),
        );
        lookTmp.y = THREE.MathUtils.clamp(lookTmp.y, cityCenterPos.y + 90, cityCenterPos.y + 182);
        camera.lookAt(lookTmp);
        rainAnchor.position.copy(camera.position);

        const pulse = 0.5 + 0.5 * Math.sin(t * 0.22);
        floorGlowMat.opacity = 0.12 + pulse * 0.1;
        laneMat.opacity = 0.1 + pulse * 0.12;
        skyGlowMat.opacity = 0.05 + (0.5 + 0.5 * Math.sin(t * 0.17)) * 0.06;

        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.copy(tmpColor.setRGB(
            0.04 + pulse * 0.014,
            0.058 + pulse * 0.018,
            0.094 + pulse * 0.024,
          ));
        }

        for (const c of cars) {
          c.u = (c.u + dt * c.rate) % 1;
          c.phase += dt * 1.1;
          tmpPos.lerpVectors(c.start, c.end, c.u);
          tmpNext.lerpVectors(c.start, c.end, (c.u + 0.01) % 1);
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

        const pos = rainGeo.getAttribute("position") as unknown as ThreeTypes.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          const headY = pos.getY((i * 2) + 0);
          const spd = rainSpd[i] ?? 0;
          const nextY = headY - (spd * dt);
          if (nextY < -30) {
            const x = (rnd() - 0.5) * 360;
            const y = 120 + rnd() * 220;
            const z = -30 - rnd() * 540;
            const len = 0.9 + rnd() * 4.4;
            pos.setXYZ((i * 2) + 0, x, y, z);
            pos.setXYZ((i * 2) + 1, x, y - len, z);
          } else {
            pos.setY((i * 2) + 0, nextY);
            pos.setY((i * 2) + 1, pos.getY((i * 2) + 1) - (spd * dt));
          }
        }
        pos.needsUpdate = true;

        bloom.strength = 0.92;
        bloom.radius = 0.84;

        composer.render();
        raf = requestAnimationFrame(render);
      };
      resize();
      composer.render();
      markReady();
      raf = requestAnimationFrame(render);

      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        cancelAnimationFrame(raf);

        (composer as any).dispose?.();
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
  }, [enabled, reducedMotion, onError, onReady]);

  if (!enabled || reducedMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      className={`ax-orion${ready ? " is-ready" : ""}`}
      aria-hidden
    />
  );
}
