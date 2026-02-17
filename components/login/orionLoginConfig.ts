export type OrionQualityPreset = "ultra" | "high" | "medium" | "low";
export type OrionTrafficMode = "legacy" | "pooled";
export type OrionRainMode = "legacy" | "layered";

export type OrionLightingConfig = {
  exposure: number;
  gamma: number;
  midtoneLift: number;
  fogDensity: number;
  readabilityBoost: number;
  safeZone: {
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
    softness: number;
    darken: number;
    liftOutside: number;
  };
};

export type OrionPostConfig = {
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  sharpenAmount: number;
  msaaSamples: number;
  fxaaEnabled: boolean;
  pixelRatioCap: number;
  safeZoneEnabled: boolean;
  floorGlowBase: number;
  floorGlowAmp: number;
  laneGlowBase: number;
  laneGlowAmp: number;
};

export type OrionTextureConfig = {
  anisotropy: number;
};

export type OrionMaterialConfig = {
  building: {
    metalness: number;
    roughness: number;
    envMapIntensity: number;
    alphaTest: number;
    alphaToCoverage: boolean;
  };
  main: {
    emissiveBase: number;
    metalness: number;
    roughness: number;
    alphaTest: number;
  };
  animatedSolid: {
    emissiveBase: number;
    metalness: number;
    roughness: number;
  };
  animatedTransparent: {
    enabled: boolean;
    emissiveBase: number;
    alphaTest: number;
  };
};

export type OrionTrafficConfig = {
  enabled: boolean;
  mode: OrionTrafficMode;
  spawnMin: number;
  spawnMax: number;
  maxActive: number;
  speedMin: number;
  speedMax: number;
  laneOffsets: number[];
  bobMin: number;
  bobMax: number;
  legacyLaneCount: number;
  legacyLaneSpacing: number;
};

export type OrionBillboardConfig = {
  enabled: boolean;
  count: number;
  animatedCount: number;
  flicker: boolean;
  glitch: boolean;
};

export type OrionRainConfig = {
  mode: OrionRainMode;
  layers: number;
  countPerLayer: number;
  legacySpreadX: number;
  legacySpreadZ: number;
  legacyResetTop: number;
  legacyLenMax: number;
};

export type OrionLoginRuntimeConfig = {
  featureEnabled: boolean;
  quality: OrionQualityPreset;
  seed: number;
  lighting: OrionLightingConfig;
  post: OrionPostConfig;
  textures: OrionTextureConfig;
  materials: OrionMaterialConfig;
  traffic: OrionTrafficConfig;
  billboards: OrionBillboardConfig;
  rain: OrionRainConfig;
};

const BASELINE_CONFIG: OrionLoginRuntimeConfig = {
  featureEnabled: true,
  quality: "high",
  seed: 0x0badc0de,
  lighting: {
    exposure: 1.2,
    gamma: 1,
    midtoneLift: 0,
    fogDensity: 0.00062,
    readabilityBoost: 1,
    safeZone: {
      centerX: 0.5,
      centerY: 0.56,
      radiusX: 0.24,
      radiusY: 0.26,
      softness: 0.34,
      darken: 0,
      liftOutside: 0,
    },
  },
  post: {
    bloomStrength: 0.92,
    bloomRadius: 0.84,
    bloomThreshold: 0.2,
    sharpenAmount: 0,
    msaaSamples: 4,
    fxaaEnabled: false,
    pixelRatioCap: 2,
    safeZoneEnabled: false,
    floorGlowBase: 0.12,
    floorGlowAmp: 0.1,
    laneGlowBase: 0.1,
    laneGlowAmp: 0.12,
  },
  textures: {
    anisotropy: 16,
  },
  materials: {
    building: {
      metalness: 0.22,
      roughness: 0.78,
      envMapIntensity: 0.12,
      alphaTest: 0.4,
      alphaToCoverage: false,
    },
    main: {
      emissiveBase: 0.9,
      metalness: 0.03,
      roughness: 0.92,
      alphaTest: 0.5,
    },
    animatedSolid: {
      emissiveBase: 0.82,
      metalness: 0.1,
      roughness: 0.78,
    },
    animatedTransparent: {
      enabled: false,
      emissiveBase: 0.2,
      alphaTest: 0.08,
    },
  },
  traffic: {
    enabled: true,
    mode: "legacy",
    spawnMin: 0.4,
    spawnMax: 1.0,
    maxActive: 6,
    speedMin: 0.033,
    speedMax: 0.068,
    laneOffsets: [-14, 0, 14],
    bobMin: 0.7,
    bobMax: 1.3,
    legacyLaneCount: 5,
    legacyLaneSpacing: 84,
  },
  billboards: {
    enabled: false,
    count: 0,
    animatedCount: 0,
    flicker: false,
    glitch: false,
  },
  rain: {
    mode: "legacy",
    layers: 1,
    countPerLayer: 1500,
    legacySpreadX: 360,
    legacySpreadZ: 540,
    legacyResetTop: 220,
    legacyLenMax: 4.4,
  },
};

const PRESET_OVERRIDES: Record<OrionQualityPreset, Partial<OrionLoginRuntimeConfig>> = {
  ultra: {
    lighting: {
      exposure: 1.34,
      gamma: 1.01,
      midtoneLift: 0.03,
      fogDensity: 0.00056,
      readabilityBoost: 1.1,
      safeZone: {
        centerX: 0.5,
        centerY: 0.56,
        radiusX: 0.235,
        radiusY: 0.252,
        softness: 0.35,
        darken: 0.1,
        liftOutside: 0.05,
      },
    },
    post: {
      bloomStrength: 0.62,
      bloomRadius: 0.72,
      bloomThreshold: 0.24,
      sharpenAmount: 0.01,
      msaaSamples: 8,
      fxaaEnabled: true,
      pixelRatioCap: 2.2,
      safeZoneEnabled: true,
      floorGlowBase: 0.09,
      floorGlowAmp: 0.08,
      laneGlowBase: 0.08,
      laneGlowAmp: 0.1,
    },
    textures: {
      anisotropy: 12,
    },
    materials: {
      building: {
        metalness: 0.12,
        roughness: 0.88,
        envMapIntensity: 0.05,
        alphaTest: 0.36,
        alphaToCoverage: true,
      },
      main: {
        emissiveBase: 0.92,
        roughness: 0.9,
        alphaTest: 0.42,
      },
      animatedSolid: {
        emissiveBase: 0.84,
        metalness: 0.08,
        roughness: 0.82,
      },
      animatedTransparent: {
        enabled: true,
        emissiveBase: 0.12,
        alphaTest: 0.08,
      },
    },
    traffic: {
      enabled: true,
      mode: "pooled",
      spawnMin: 0.9,
      spawnMax: 2.2,
      maxActive: 14,
      speedMin: 0.029,
      speedMax: 0.075,
      laneOffsets: [-20, -10, 0, 10, 20],
      bobMin: 0.74,
      bobMax: 1.4,
    },
    billboards: {
      enabled: true,
      count: 3,
      animatedCount: 1,
      flicker: true,
      glitch: false,
    },
    rain: {
      mode: "layered",
      layers: 2,
      countPerLayer: 1100,
    },
  },
  high: {
    lighting: {
      exposure: 1.28,
      gamma: 1,
      midtoneLift: 0.015,
      fogDensity: 0.00059,
      readabilityBoost: 1.05,
      safeZone: {
        centerX: 0.5,
        centerY: 0.56,
        radiusX: 0.24,
        radiusY: 0.258,
        softness: 0.34,
        darken: 0.06,
        liftOutside: 0.02,
      },
    },
    post: {
      bloomStrength: 0.56,
      bloomRadius: 0.7,
      bloomThreshold: 0.28,
      sharpenAmount: 0,
      msaaSamples: 4,
      fxaaEnabled: true,
      pixelRatioCap: 2,
      safeZoneEnabled: true,
      floorGlowBase: 0.11,
      floorGlowAmp: 0.09,
      laneGlowBase: 0.095,
      laneGlowAmp: 0.11,
    },
    textures: {
      anisotropy: 12,
    },
    materials: {
      building: {
        metalness: 0.1,
        roughness: 0.9,
        envMapIntensity: 0.04,
        alphaTest: 0.38,
        alphaToCoverage: true,
      },
      main: {
        emissiveBase: 0.9,
        roughness: 0.93,
        alphaTest: 0.44,
      },
      animatedSolid: {
        emissiveBase: 0.8,
        metalness: 0.07,
        roughness: 0.86,
      },
      animatedTransparent: {
        enabled: false,
        emissiveBase: 0.1,
        alphaTest: 0.08,
      },
    },
    traffic: {
      enabled: true,
      mode: "legacy",
      maxActive: 6,
      speedMin: 0.033,
      speedMax: 0.068,
      bobMin: 0.7,
      bobMax: 1.3,
    },
    billboards: {
      enabled: false,
      count: 0,
      animatedCount: 0,
      flicker: false,
      glitch: false,
    },
    rain: {
      mode: "legacy",
      layers: 1,
      countPerLayer: 1500,
    },
  },
  medium: {
    lighting: {
      exposure: 1.22,
      gamma: 1,
      midtoneLift: 0.008,
      fogDensity: 0.00062,
      readabilityBoost: 1.02,
      safeZone: {
        centerX: 0.5,
        centerY: 0.56,
        radiusX: 0.24,
        radiusY: 0.26,
        softness: 0.34,
        darken: 0,
        liftOutside: 0,
      },
    },
    post: {
      bloomStrength: 0.52,
      bloomRadius: 0.82,
      bloomThreshold: 0.3,
      sharpenAmount: 0,
      msaaSamples: 2,
      fxaaEnabled: true,
      pixelRatioCap: 1.75,
      safeZoneEnabled: false,
      floorGlowBase: 0.11,
      floorGlowAmp: 0.09,
      laneGlowBase: 0.09,
      laneGlowAmp: 0.1,
    },
    textures: {
      anisotropy: 8,
    },
    materials: {
      building: {
        metalness: 0.14,
        roughness: 0.86,
        envMapIntensity: 0.07,
        alphaTest: 0.42,
        alphaToCoverage: false,
      },
      main: {
        emissiveBase: 0.88,
        roughness: 0.93,
        alphaTest: 0.46,
      },
      animatedSolid: {
        emissiveBase: 0.82,
        metalness: 0.08,
        roughness: 0.84,
      },
      animatedTransparent: {
        enabled: false,
        emissiveBase: 0.18,
        alphaTest: 0.09,
      },
    },
    traffic: {
      enabled: true,
      mode: "legacy",
      maxActive: 5,
      speedMin: 0.03,
      speedMax: 0.06,
      bobMin: 0.68,
      bobMax: 1.2,
    },
    billboards: {
      enabled: false,
      count: 0,
      animatedCount: 0,
      flicker: false,
      glitch: false,
    },
    rain: {
      mode: "legacy",
      layers: 1,
      countPerLayer: 1200,
    },
  },
  low: {
    lighting: {
      exposure: 1.16,
      gamma: 1,
      midtoneLift: 0,
      fogDensity: 0.00065,
      readabilityBoost: 0.98,
      safeZone: {
        centerX: 0.5,
        centerY: 0.56,
        radiusX: 0.24,
        radiusY: 0.26,
        softness: 0.34,
        darken: 0,
        liftOutside: 0,
      },
    },
    post: {
      bloomStrength: 0.35,
      bloomRadius: 0.78,
      bloomThreshold: 0.34,
      sharpenAmount: 0,
      msaaSamples: 1,
      fxaaEnabled: true,
      pixelRatioCap: 1.5,
      safeZoneEnabled: false,
      floorGlowBase: 0.1,
      floorGlowAmp: 0.08,
      laneGlowBase: 0.08,
      laneGlowAmp: 0.1,
    },
    textures: {
      anisotropy: 4,
    },
    materials: {
      building: {
        metalness: 0.1,
        roughness: 0.9,
        envMapIntensity: 0.04,
        alphaTest: 0.46,
        alphaToCoverage: false,
      },
      main: {
        emissiveBase: 0.8,
        roughness: 0.95,
        alphaTest: 0.5,
      },
      animatedSolid: {
        emissiveBase: 0.74,
        metalness: 0.06,
        roughness: 0.88,
      },
      animatedTransparent: {
        enabled: false,
        emissiveBase: 0.14,
        alphaTest: 0.1,
      },
    },
    traffic: {
      enabled: true,
      mode: "legacy",
      maxActive: 4,
      speedMin: 0.028,
      speedMax: 0.052,
      bobMin: 0.62,
      bobMax: 1.05,
    },
    billboards: {
      enabled: false,
      count: 0,
      animatedCount: 0,
      flicker: false,
      glitch: false,
    },
    rain: {
      mode: "legacy",
      layers: 1,
      countPerLayer: 760,
    },
  },
};

function parseBoolean(raw: unknown, fallback: boolean): boolean {
  if (typeof raw !== "string") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

function normalizeQuality(raw: unknown): OrionQualityPreset | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (v === "ultra" || v === "high" || v === "medium" || v === "low") return v;
  return null;
}

function resolveAutoQuality(): OrionQualityPreset {
  if (typeof window === "undefined") return "high";
  const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency
    ? navigator.hardwareConcurrency
    : 8;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, window.innerWidth || 1);

  if (cores <= 4 || width < 900) return "low";
  if (cores <= 6 || dpr > 2.4) return "medium";
  if (cores >= 12 && dpr <= 2) return "ultra";
  return "high";
}

function deepMerge(base: OrionLoginRuntimeConfig, override: Partial<OrionLoginRuntimeConfig>): OrionLoginRuntimeConfig {
  return {
    ...base,
    ...override,
    lighting: {
      ...base.lighting,
      ...(override.lighting ?? {}),
      safeZone: {
        ...base.lighting.safeZone,
        ...(override.lighting?.safeZone ?? {}),
      },
    },
    post: {
      ...base.post,
      ...(override.post ?? {}),
    },
    textures: {
      ...base.textures,
      ...(override.textures ?? {}),
    },
    materials: {
      building: {
        ...base.materials.building,
        ...(override.materials?.building ?? {}),
      },
      main: {
        ...base.materials.main,
        ...(override.materials?.main ?? {}),
      },
      animatedSolid: {
        ...base.materials.animatedSolid,
        ...(override.materials?.animatedSolid ?? {}),
      },
      animatedTransparent: {
        ...base.materials.animatedTransparent,
        ...(override.materials?.animatedTransparent ?? {}),
      },
    },
    traffic: {
      ...base.traffic,
      ...(override.traffic ?? {}),
    },
    billboards: {
      ...base.billboards,
      ...(override.billboards ?? {}),
    },
    rain: {
      ...base.rain,
      ...(override.rain ?? {}),
    },
  };
}

export function resolveOrionLoginRuntimeConfig(): OrionLoginRuntimeConfig {
  const env = ((import.meta as any)?.env ?? {}) as Record<string, unknown>;
  const queryQuality = typeof window !== "undefined"
    ? normalizeQuality(new URLSearchParams(window.location.search).get("orionQuality"))
    : null;
  const envQuality = normalizeQuality(env.VITE_ORION_LOGIN_BG_QUALITY);
  const quality = queryQuality ?? envQuality ?? "ultra";

  const seedRaw = Number.parseInt(String(env.VITE_ORION_LOGIN_BG_SEED ?? ""), 10);
  const seed = Number.isFinite(seedRaw) ? (seedRaw >>> 0) : BASELINE_CONFIG.seed;

  const featureEnabled = parseBoolean(env.VITE_ORION_LOGIN_BG_V2, true);

  if (!featureEnabled) {
    const legacy = deepMerge(BASELINE_CONFIG, {});
    legacy.featureEnabled = false;
    legacy.quality = quality;
    legacy.seed = seed;
    return legacy;
  }

  const config = deepMerge(BASELINE_CONFIG, PRESET_OVERRIDES[quality] ?? {});
  config.featureEnabled = true;
  config.quality = quality;
  config.seed = seed;
  return config;
}
