import React, { useEffect, useRef } from "react";
import type * as ThreeTypes from "three";

type OrionCityBackgroundProps = {
  enabled: boolean;
  reducedMotion: boolean;
};

function publicUrl(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const b = base.endsWith("/") ? base : `${base}/`;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${b}${p}`;
}

function supportsWebGL(canvas: HTMLCanvasElement) {
  try {
    // WebGL2 preferred, but WebGL1 is enough for this scene.
    const gl = canvas.getContext("webgl2", { powerPreference: "high-performance" })
      ?? canvas.getContext("webgl", { powerPreference: "high-performance" })
      ?? canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function OrionCityBackground({ enabled, reducedMotion }: OrionCityBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || reducedMotion) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    if (!supportsWebGL(canvas)) return undefined;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");
      const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
      const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
      const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
      const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");

      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        depth: true,
        stencil: false,
        powerPreference: "high-performance",
      });
      // three's public types vary between minor versions; keep these as best-effort.
      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      (renderer as any).physicallyCorrectLights = true;
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a0b10, 0.00125);

      const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2200);
      camera.position.set(0, 200, 632);
      scene.add(camera);

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.05, 0.92, 0.22);
      composer.addPass(bloom);

      const amb = new THREE.AmbientLight(0xffffff, 0.42);
      const key = new THREE.DirectionalLight(0xf0fbff, 0.65);
      key.position.set(12, 18, 8);
      const fill = new THREE.PointLight(0x48ffe6, 0.85, 160, 2);
      fill.position.set(-12, 12, -18);
      const rim = new THREE.PointLight(0xff4a78, 0.65, 180, 2);
      rim.position.set(18, 10, -42);
      scene.add(amb, key);
      scene.add(fill, rim);

      function makeWindowsTexture(accent: ThreeTypes.ColorRepresentation) {
        const c = document.createElement("canvas");
        c.width = 96; c.height = 192;
        const ctx = c.getContext("2d");
        if (!ctx) return new THREE.CanvasTexture(c);

        ctx.fillStyle = "#020205";
        ctx.fillRect(0, 0, c.width, c.height);

        const accentColor = new THREE.Color(accent);
        const base = { r: Math.floor(accentColor.r * 255), g: Math.floor(accentColor.g * 255), b: Math.floor(accentColor.b * 255) };
        const cellW = 6;
        const cellH = 8;
        for (let y = 6; y < c.height - 6; y += cellH) {
          for (let x = 6; x < c.width - 6; x += cellW) {
            if (Math.random() < 0.62) continue;
            const v = 0.45 + Math.random() * 0.55;
            const a = 0.24 + Math.random() * 0.65;
            const r = Math.floor(base.r * v);
            const g = Math.floor(base.g * v);
            const b = Math.floor(base.b * v);
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.fillRect(x, y, Math.max(1, cellW - 2), Math.max(1, cellH - 3));
          }
        }

        // add a few "billboard" streaks
        for (let i = 0; i < 18; i++) {
          const x = Math.floor(Math.random() * c.width);
          const y = Math.floor(Math.random() * c.height);
          const w = 10 + Math.floor(Math.random() * 40);
          const h = 1 + Math.floor(Math.random() * 2);
          ctx.fillStyle = "rgba(255,255,255,0.06)";
          ctx.fillRect(x, y, w, h);
        }

        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // The Orion glTF has UVs designed for a tex atlas; repeat gives quick "windows" detail.
        tex.repeat.set(10, 6);
        tex.needsUpdate = true;
        return tex;
      }

      const texCyan = makeWindowsTexture(0x4fffe8);
      const texGreen = makeWindowsTexture(0x6bff9f);
      const texMag = makeWindowsTexture(0xff6bda);

      const world = new THREE.Group();
      scene.add(world);

      // Load Orion city model (ported from orion.adrianred.com, reduced variant).
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(publicUrl("draco/gltf/"));
      // JS-only decoder to keep runtime simple (no wasm MIME issues).
      dracoLoader.setDecoderConfig({ type: "js" });

      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      const level = (await gltfLoader.loadAsync(publicUrl("assets/orion/level.glb"))).scene;
      if (disposed) { dracoLoader.dispose(); return; }
      world.add(level);
      world.updateMatrixWorld(true);

      // Camera anchor from the model (same idea as Orion's own preloader camera).
      const baseCam = new THREE.Vector3(0, 200, 632);
      const lookTarget = new THREE.Vector3(0.926, -3.9, -126);
      level.getObjectByName("Preloader-Camera")?.getWorldPosition(baseCam);
      level.getObjectByName("City-Center")?.getWorldPosition(lookTarget);
      camera.position.copy(baseCam);
      camera.lookAt(lookTarget);

      // Material overrides: the reduced model ships without textures; fake "windows" via emissive map.
      const cityMat = new THREE.MeshStandardMaterial({
        color: 0x070810,
        roughness: 0.92,
        metalness: 0.18,
        emissive: new THREE.Color(0x125a54),
        emissiveIntensity: 1.85,
        emissiveMap: texCyan,
      });
      const grateMat = new THREE.MeshStandardMaterial({
        color: 0x05060b,
        roughness: 0.96,
        metalness: 0.12,
        emissive: new THREE.Color(0x0f3a22),
        emissiveIntensity: 1.2,
        emissiveMap: texGreen,
      });

      const applyMatByName = (name: string, mat: THREE.MeshStandardMaterial) => {
        const obj = level.getObjectByName(name);
        if (!obj) return;
        obj.traverse((o: ThreeTypes.Object3D) => {
          const mesh = o as any;
          if (mesh.isMesh) {
            mesh.material = mat;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });
      };
      applyMatByName("Main", cityMat);
      applyMatByName("Grating", grateMat);
      applyMatByName("Gratin-Center", grateMat);

      // Hide gameplay-only objects; keep city + air traffic markers.
      level.traverse((o: ThreeTypes.Object3D) => {
        const nm = o.name || "";
        if (
          nm === "Collision"
          || nm === "Elevator-Collision"
          || nm === "Elevator-Mesh"
          || nm === "Hologram1"
          || nm === "Coin"
          || nm.startsWith("Coin-Instance")
          || nm === "Arcade"
          || nm === "Arcade-Screen"
          || nm.startsWith("Arcade-Instance")
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

      // Air traffic (real Orion flying-car meshes).
      const carTemplates = [
        level.getObjectByName("flying-car-traffic-1"),
        level.getObjectByName("flying-car-traffic-2"),
        level.getObjectByName("flying-car-traffic-3"),
        level.getObjectByName("flying-car"),
      ].filter(Boolean) as ThreeTypes.Object3D[];

      for (const t of carTemplates) t.visible = false;

      const carMats = [
        new THREE.MeshStandardMaterial({
          color: 0x07070d,
          roughness: 0.35,
          metalness: 0.85,
          emissive: new THREE.Color(0x16ffe7),
          emissiveIntensity: 0.22,
        }),
        new THREE.MeshStandardMaterial({
          color: 0x07070d,
          roughness: 0.38,
          metalness: 0.82,
          emissive: new THREE.Color(0xff4a78),
          emissiveIntensity: 0.18,
        }),
        new THREE.MeshStandardMaterial({
          color: 0x07070d,
          roughness: 0.4,
          metalness: 0.8,
          emissive: new THREE.Color(0x6bff9f),
          emissiveIntensity: 0.18,
        }),
      ];

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
        const start = new THREE.Vector3(); s.getWorldPosition(start);
        const end = new THREE.Vector3(); e.getWorldPosition(end);
        paths.push({ start, end });
      }

      for (let i = 0; i < Math.min(paths.length, 6); i++) {
        const path = paths[i]!;
        const tpl = carTemplates[i % Math.max(1, carTemplates.length)];
        if (!tpl) continue;

        const m = tpl.clone(true);
        m.scale.setScalar(0.9 + Math.random() * 0.35);

        const mat = carMats[i % carMats.length]!;
        m.traverse((o: ThreeTypes.Object3D) => {
          const mesh = o as any;
          if (mesh.isMesh) {
            mesh.material = mat;
            mesh.castShadow = false;
            mesh.receiveShadow = false;
          }
        });

        traffic.add(m);
        cars.push({
          m,
          start: path.start.clone(),
          end: path.end.clone(),
          u: Math.random(),
          rate: 0.035 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
          bob: 0.8 + Math.random() * 1.4,
        });
      }

      // rain: thin line segments in front of camera
      const rainCount = 860;
      const rainPos = new Float32Array(rainCount * 2 * 3);
      const rainSpd = new Float32Array(rainCount);
      for (let i = 0; i < rainCount; i++) {
        const x = (Math.random() - 0.5) * 140;
        const y = 10 + Math.random() * 140;
        const z = -20 - Math.random() * 220;
        const len = 0.8 + Math.random() * 3.2;
        rainPos[(i * 6) + 0] = x;
        rainPos[(i * 6) + 1] = y;
        rainPos[(i * 6) + 2] = z;
        rainPos[(i * 6) + 3] = x;
        rainPos[(i * 6) + 4] = y - len;
        rainPos[(i * 6) + 5] = z;
        rainSpd[i] = 28 + Math.random() * 52;
      }
      const rainGeo = new THREE.BufferGeometry();
      rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
      const rainMat = new THREE.LineBasicMaterial({
        color: 0xb8e6ff,
        transparent: true,
        opacity: 0.21,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
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
      }

      const pointer = { tx: 0, ty: 0, x: 0, y: 0 };
      const onMove = (e: PointerEvent) => {
        const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
        const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
        pointer.tx = nx;
        pointer.ty = ny;
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      // Observe class changes for short "glitch" spikes (sync with CSS/UI).
      const host = canvas.closest(".ax-login");
      let glitchUntil = 0;
      const mo = host ? new MutationObserver(() => {
        if (host.classList.contains("ax-glitch")) glitchUntil = performance.now() + 220;
      }) : null;
      mo?.observe(host!, { attributes: true, attributeFilter: ["class"] });

      let last = performance.now();
      const lookTmp = new THREE.Vector3();
      const tmpPos = new THREE.Vector3();
      const tmpNext = new THREE.Vector3();
      const tmpDir = new THREE.Vector3();
      const tmpQuat = new THREE.Quaternion();
      const tmpRoll = new THREE.Quaternion();
      const carForward = new THREE.Vector3(1, 0, 0); // flying-car forward axis from the glTF (thrusters confirm +X is "front")

      const render = (now: number) => {
        if (disposed) return;
        resize();

        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const t = now * 0.001;
        const glitchOn = now < glitchUntil;

        // camera parallax + gentle drift
        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        const jx = glitchOn ? (Math.random() - 0.5) * 1.2 : 0;
        const jy = glitchOn ? (Math.random() - 0.5) * 0.7 : 0;
        camera.position.x = baseCam.x + pointer.x * 24 + jx;
        camera.position.y = baseCam.y + (-pointer.y) * 12 + Math.sin(t * 0.22) * 1.4 + jy;
        camera.position.z = baseCam.z + Math.sin(t * 0.16) * 2.2;
        lookTmp.set(
          lookTarget.x + pointer.x * 42,
          lookTarget.y + (-pointer.y) * 18,
          lookTarget.z,
        );
        camera.lookAt(lookTmp);
        rainAnchor.position.copy(camera.position);

        // traffic loop (subtle)
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
            tmpRoll.setFromAxisAngle(tmpDir, Math.sin(c.phase * 1.4) * 0.12);
            c.m.quaternion.copy(tmpQuat).multiply(tmpRoll);
          }
          c.m.position.set(tmpPos.x, tmpPos.y + Math.sin(c.phase) * c.bob, tmpPos.z);
        }

        // rain update
        const pos = rainGeo.getAttribute("position") as unknown as ThreeTypes.BufferAttribute;
        for (let i = 0; i < rainCount; i++) {
          const headY = pos.getY((i * 2) + 0);
          const spd = rainSpd[i] ?? 0;
          const nextY = headY - (spd * dt);
          if (nextY < -30) {
            const x = (Math.random() - 0.5) * 140;
            const y = 60 + Math.random() * 120;
            const z = -20 - Math.random() * 220;
            const len = 0.8 + Math.random() * 3.2;
            pos.setXYZ((i * 2) + 0, x, y, z);
            pos.setXYZ((i * 2) + 1, x, y - len, z);
          } else {
            // move both vertices down
            pos.setY((i * 2) + 0, nextY);
            pos.setY((i * 2) + 1, pos.getY((i * 2) + 1) - (spd * dt));
          }
        }
        pos.needsUpdate = true;

        bloom.strength = glitchOn ? 1.25 : 1.05;

        composer.render();
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);

      cleanup = () => {
        window.removeEventListener("pointermove", onMove);
        mo?.disconnect();
        cancelAnimationFrame(raf);

        (composer as any).dispose?.();
        dracoLoader.dispose();
        renderer.dispose();

        scene.traverse((obj: ThreeTypes.Object3D) => {
          const anyObj = obj as any;
          if (anyObj.geometry?.dispose) anyObj.geometry.dispose();
          if (anyObj.material) {
            const mats = Array.isArray(anyObj.material) ? anyObj.material : [anyObj.material];
            for (const m of mats) {
              if (m.map?.dispose) m.map.dispose();
              if (m.emissiveMap?.dispose) m.emissiveMap.dispose();
              if (m.dispose) m.dispose();
            }
          }
        });

        texCyan.dispose();
        texGreen.dispose();
        texMag.dispose();
      };
    })().catch(() => {
      // If anything fails (e.g. missing WebGL), keep the CSS fallback.
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [enabled, reducedMotion]);

  if (!enabled || reducedMotion) return null;
  return (
    <canvas
      ref={canvasRef}
      className="ax-orion"
      aria-hidden
    />
  );
}
