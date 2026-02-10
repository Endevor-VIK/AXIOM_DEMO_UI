// AXIOM_DEMO_UI — WEB CORE
// File: app/routes/login/page.tsx

import React, {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login, register } from "@/lib/identity/authService";
import { OrionCityBackground } from "@/components/login/OrionCityBackground";

import "@/styles/login-bg.css";
import "@/styles/login-cyber.css";
import "@/styles/login-boot.css";

type Mode = "login" | "register";
type BootPhase = "booting" | "reveal" | "ready";

const TITLES: Record<Mode, string> = {
  login: "WELCOME TO AXIOM PANEL",
  register: "REGISTER NEW OPERATIVE",
};
const SUBTITLES: Record<Mode, string> = {
  login: "RED PROTOCOL ACCESS GATEWAY",
  register: "PROVISION ACCESS KEY",
};

const BOOT_LINES = [
  { tag: "SYS", text: "kernel integrity check", status: "OK" },
  { tag: "NET", text: "uplink handshake • 5ms", status: "OK" },
  { tag: "SEC", text: "cipher matrix sealed", status: "OK" },
  { tag: "AI", text: "persona cache warmed", status: "OK" },
  { tag: "UI", text: "render pipeline armed", status: "OK" },
  { tag: "OPS", text: "access gate online", status: "OK" },
];

function SealDisk({ size = 84 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 88 88" className="ax-seal" aria-hidden>
      <defs>
        <radialGradient id="axAura" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%" stopColor="#ffede8" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--ax-red)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="axRing" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ax-red)" />
          <stop offset="100%" stopColor="var(--ax-red-2)" />
        </linearGradient>
        <linearGradient id="axBlade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff6f4" stopOpacity="0.95" />
          <stop offset="58%" stopColor="#ff4a54" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#5a0a12" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx="44" cy="44" r="40" fill="url(#axAura)" stroke="url(#axRing)" strokeWidth="2" />
      <g className="ax-seal__orbit">
        <ellipse cx="44" cy="44" rx="29" ry="10" fill="none" stroke="#ff6b75" strokeWidth="1" opacity="0.36" />
      </g>
      <g className="ax-seal__blade">
        <path d="M44 16 L54 44 L44 72 L34 44 Z" fill="url(#axBlade)" />
      </g>
      <circle cx="44" cy="44" r="10" fill="var(--ax-red)" opacity="0.24" />
      <circle cx="44" cy="44" r="4" fill="#fff2f2" opacity="0.96" />
    </svg>
  );
}

/* ---------- упрощённый «терминал» поверх фона ---------- */

type PresetKind = "ok" | "info" | "warn" | "alert" | "ghost";
type Preset = { title: string; kind: PresetKind; lines: string[]; footer?: string };

function randInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function hex4() {
  return randInt(0, 0xffff).toString(16).padStart(4, "0");
}

function hydrate(p: Preset): Preset {
  const lat = randInt(3, 28);
  const nodes = `${randInt(4, 9)}/${randInt(6, 12)}`;
  const rot = `Δ+${randInt(1, 3)}`;
  const ch = `${hex4()}-${hex4()}`;
  const sig = randInt(62, 99);
  const hop = randInt(1, 6);
  const slot = randInt(1, 9);
  const utc = new Date().toISOString().slice(11, 19);
  const lines = p.lines.map((l) => l
    .replaceAll("{lat}", String(lat))
    .replaceAll("{nodes}", nodes)
    .replaceAll("{rot}", rot)
    .replaceAll("{ch}", ch)
    .replaceAll("{sig}", String(sig))
    .replaceAll("{hop}", String(hop))
    .replaceAll("{slot}", String(slot))
    .replaceAll("{utc}", utc));
  return { ...p, lines };
}

const PRESETS: Preset[] = [
  { title: "OPS://AUTH_GATEWAY", kind: "ok", lines: [
    "mesh: uplink ok • latency {lat}ms",
    "vault: checksum {ch} • sealed",
    "ai: credentials required.",
  ], footer: "CHANNEL: LOGIN • STATUS: ONLINE" },
  { title: "NETSEC://WATCHDOG", kind: "info", lines: [
    "sentry: nodes {nodes} • green",
    "keys: rotation {rot}",
    "trace: hop {hop} • signal {sig}%",
  ], footer: "EYES ONLY • WATCHDOG ACTIVE" },
  { title: "SIGINT://ECHO", kind: "ghost", lines: [
    "ping: {lat}ms • jitter 1.2ms",
    "voiceprint: masked",
    "msg: \"keep moving.\"",
  ]},
  { title: "VAULT://POLICY", kind: "warn", lines: [
    "access: challenge slot {slot}",
    "token: ttl 00:{lat}:00",
    "hint: do not reuse keys.",
  ]},
  { title: "OPS://RATE_LIMIT", kind: "alert", lines: [
    "pattern: brute-force signature",
    "throttle: engaged • {sig}%",
    "time: {utc}Z",
  ]},
  { title: "CORE://RENDER_PIPE", kind: "info", lines: [
    "webgl: compositor online",
    "bloom: pass armed",
    "rain: particles synced",
  ]},
  { title: "OPS://SESSION", kind: "ok", lines: [
    "session: ax_session_v1",
    "scope: panel access",
    "handoff: pending",
  ]},
  { title: "WATCH://ANOMALY", kind: "warn", lines: [
    "signal: unstable edge",
    "drift: +0.{sig}",
    "countermeasure: isolate",
  ]},
  { title: "UI://TELEMETRY", kind: "ghost", lines: [
    "cursor: tracking",
    "viewport: sealed",
    "observer: {hop} active",
  ]},
];

function useReducedMotion() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setOn(mq.matches);
    upd(); mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);
  return on;
}

function CyberDeckOverlay({ root }: { root: React.RefObject<HTMLElement> }) {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [side, setSide] = useState<"left" | "right">("left");
  const [top, setTop] = useState(120);
  const [preset, setPreset] = useState<Preset>(hydrate(PRESETS[0] ?? { title: "", kind: "info", lines: [] }));
  const [typed, setTyped] = useState<string[]>([]);
  const typingTimer = useRef<number | null>(null);
  const cycleTimer = useRef<number | null>(null);

  // печать коротких строк — лёгко и дёшево
  const startTyping = useCallback(() => {
    let li = 0, ci = 0;
    setTyped(Array.from({ length: preset.lines.length }, () => ""));
    if (typingTimer.current) { clearInterval(typingTimer.current); typingTimer.current = null; }
    const speed = randInt(12, 18);
    typingTimer.current = window.setInterval(() => {
      const line = preset.lines[li] ?? "";
      setTyped((old) => {
        const next = [...old];
        next[li] = line.slice(0, ci + 1);
        return next;
      });
      ci++;
      if (ci >= line.length) { li++; ci = 0; }
      if (li >= preset.lines.length) {
        if (typingTimer.current) { clearInterval(typingTimer.current); typingTimer.current = null; }
      }
    }, speed);
  }, [preset]);

  // безопасный короткий глитч: только внутри .ax-login, только для оверлея
  const runGlitch = useCallback(() => {
    const host = root.current;
    if (!host) return;
    host.classList.add("ax-glitch");
    window.setTimeout(() => host.classList.remove("ax-glitch"), 180);
  }, [root]);

  // цикл показов
  useEffect(() => {
    if (reduced) return;
    const schedule = () => {
      if (document.hidden) {
        cycleTimer.current = window.setTimeout(schedule, 6000);
        return;
      }
      cycleTimer.current = window.setTimeout(() => {
        const idx = PRESETS.length > 0 ? Math.floor(Math.random() * PRESETS.length) : 0;
        setPreset(hydrate(PRESETS[idx] ?? { title: "", kind: "info", lines: [] }));
        setSide(Math.random() > 0.5 ? "right" : "left");
        setTop(100 + Math.floor(Math.random() * 180));
        setVisible(true);
        runGlitch();
        window.setTimeout(startTyping, 100);
        window.setTimeout(() => setVisible(false), 4000 + Math.floor(Math.random() * 2000));
        schedule();
      }, 9000 + Math.floor(Math.random() * 6000));
    };
    schedule();
    return () => {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (typingTimer.current) clearInterval(typingTimer.current);
      root.current?.classList.remove("ax-glitch");
    };
  }, [reduced, root, runGlitch, startTyping]);

  return (
    <div className="ax-cyber" aria-hidden>
      <div
        className={`ax-console is-lite ${visible ? "is-show" : ""}`}
        data-kind={preset.kind}
        style={{ top, [side]: 24 } as React.CSSProperties}
      >
        <div className="ax-console__head">
          <span className="ax-console__title">{preset.title}</span>
          <span className="ax-console__sig" aria-hidden>
            <span className="ax-console__dot" />
            <span className="ax-console__dot" />
            <span className="ax-console__dot" />
          </span>
        </div>
        <div className="ax-console__body">
          <pre className="ax-console__pre">
            {typed.map((t, i) => (
              <div key={i} className="ax-console__line">
                <span className="ax-console__prompt">$</span>
                <span className="ax-console__typed">{t}</span>
                <span className="ax-console__cursor" />
              </div>
            ))}
          </pre>
          {preset.footer && <div className="ax-console__foot">{preset.footer}</div>}
        </div>
      </div>
      {/* лёгкие scanlines; эффекты строго под карточкой */}
      <div className="ax-cyber__scanlines" />
    </div>
  );
}
/* ---------- /overlay ---------- */

function BootSequence({ phase, reduced }: { phase: BootPhase; reduced: boolean }) {
  if (phase === "ready") return null;
  const duration = reduced ? 0.6 : 2.8;

  return (
    <div
      className={`ax-boot${phase === "reveal" ? " is-leaving" : ""}${reduced ? " is-reduced" : ""}`}
      style={{ ["--boot-duration" as string]: `${duration}s` } as React.CSSProperties}
      aria-hidden
    >
      <div className="ax-boot__noise" />
      <div className="ax-boot__frame">
        <div className="ax-boot__title">
          <span className="ax-boot__brand">AXIOM.EXE</span>
          <span className="ax-boot__state">initializing access gateway</span>
        </div>
        <div className="ax-boot__meta">
          <span>build: core-ui</span>
          <span>node: auth-gateway</span>
          <span>mode: red protocol</span>
        </div>
        <div className="ax-boot__lines">
          {BOOT_LINES.map((line, index) => (
            <div
              key={`${line.tag}-${index}`}
              className="ax-boot-line"
              style={{ ["--delay" as string]: `${0.2 + index * 0.12}s` } as React.CSSProperties}
            >
              <span className="ax-boot-tag">{line.tag}</span>
              <span className="ax-boot-text">{line.text}</span>
              <span className="ax-boot-ok">{line.status}</span>
            </div>
          ))}
        </div>
        <div className="ax-boot__progress">
          <span className="ax-boot__progress-label">sync / handshake</span>
          <span className="ax-boot__progress-bar" />
        </div>
        <div className="ax-boot__footer">
          <span>access gate ready</span>
          <span className="ax-boot__cursor" />
        </div>
      </div>
      <div className="ax-boot__wipe" />
      <div className="ax-boot__scanlines" />
    </div>
  );
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [bootPhase, setBootPhase] = useState<BootPhase>("booting");

  useEffect(() => {
    document.body.classList.add("ax-no-scroll");
    return () => document.body.classList.remove("ax-no-scroll");
  }, []);

  useEffect(() => {
    setBootPhase("booting");
    const revealAt = reduced ? 220 : 2400;
    const doneAt = reduced ? 620 : 3300;
    const t1 = window.setTimeout(() => setBootPhase("reveal"), revealAt);
    const t2 = window.setTimeout(() => setBootPhase("ready"), doneAt);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced, location.key]);

  const [mode, setMode] = useState<Mode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [caps, setCaps] = useState(false);
  const [shake, setShake] = useState(false);

  const title = useMemo(() => TITLES[mode], [mode]);
  const subtitle = useMemo(() => SUBTITLES[mode], [mode]);
  const chipLabel = mode === "login" ? "MODE :: ACCESS" : "MODE :: REGISTER";
  const chipVariant = mode === "login" ? "online" : "info";

  const idUser = useId(); const idKey = useId(); const idErr = useId(); const idCaps = useId();

  useEffect(() => { if (!err) return; setShake(true); const t = setTimeout(() => setShake(false), 420); return () => clearTimeout(t); }, [err]);

  const handleToggleMode = useCallback(() => { setMode((m) => (m === "login" ? "register" : "login")); setErr(null); setPassword(""); }, []);
  const handleCaps = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // @ts-ignore
    const on = typeof e.getModifierState === "function" && e.getModifierState("CapsLock"); setCaps(Boolean(on));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr(null);
    const user = userId.trim(); const key = password;
    try {
      if (!user || !key) throw new Error("Fill both fields");
      if (mode === "register") {
        await register({ email: user, password: key, displayName: user.toUpperCase() });
      } else {
        await login({ email: user, password: key });
      }
      const fallback = "/dashboard";
      const target = (location.state as { from?: string } | null)?.from || fallback;
      nav(target, { replace: true });
    } catch (error: any) {
      const msg = String(error?.message || "Unable to authenticate");
      if (msg === "registration_disabled") setErr("Registration disabled");
      else if (msg === "user_exists") setErr("User already exists");
      else if (msg === "invalid_credentials") setErr("Invalid credentials");
      else if (msg === "missing_credentials") setErr("Fill both fields");
      else if (msg === "rate_limited") setErr("Too many attempts. Try again later.");
      else setErr(msg);
    } finally { setBusy(false); }
  }, [busy, userId, password, mode, nav]);

  const cardClasses = ["ax-card", "low", "ax-login-card"];
  if (err) cardClasses.push("is-error");
  if (shake) cardClasses.push("is-shake");
  const isBooting = bootPhase !== "ready";

  return (
    <section ref={rootRef} className="ax-login" aria-labelledby="login-title" data-boot={bootPhase}>
      {/* фон и кибер-слой строго позади карточки */}
      <div className="ax-login__bg" aria-hidden>
        <OrionCityBackground enabled={!reduced} reducedMotion={reduced} />
        <div className="ax-login__bg-sky" />
        <div className="ax-login__bg-haze" />
        <div className="ax-login__x-scan" />
        <div className="ax-login__bg-beams" />
      </div>
      <div className="ax-login__frame" aria-hidden />
      <CyberDeckOverlay root={rootRef} />
      <BootSequence phase={bootPhase} reduced={reduced} />

      <div className="ax-container">
        <form
          className={cardClasses.join(" ")}
          onSubmit={handleSubmit}
          aria-busy={busy}
          aria-hidden={isBooting ? "true" : undefined}
          style={isBooting ? { pointerEvents: "none" } : undefined}
          noValidate
        >
          <div className="ax-login-head">
            <div className="ax-login-emblem" aria-hidden><SealDisk /></div>
            <h1 id="login-title" className="ax-blade-head">{title}</h1>
            <div className="ax-hr ax-hr--viktor" aria-hidden />
            <p className="ax-login-sub">{subtitle}</p>
            <div className="ax-login-meta">
              <span className="ax-chip" data-variant={chipVariant}>{chipLabel}</span>
              <span className="ax-chip" data-variant="level">RED PROTOCOL</span>
            </div>
          </div>

          <div className="ax-login-fields ax-stack-sm" aria-describedby={err ? idErr : caps ? idCaps : undefined}>
            <label className="ax-visually-hidden" htmlFor={idUser}>User ID</label>
            <input id={idUser} className={`ax-input${err ? " is-invalid" : ""}`} name="user" placeholder="USER ID"
              value={userId} onChange={(e) => setUserId(e.target.value)} autoComplete="username" aria-invalid={err ? "true" : undefined} disabled={busy} />
            <label className="ax-visually-hidden" htmlFor={idKey}>Access Key</label>
            <input id={idKey} className={`ax-input${err ? " is-invalid" : ""}`} name="key" placeholder="ACCESS KEY" type="password"
              value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={handleCaps}
              autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={err ? "true" : undefined} disabled={busy} />
            {caps && !err && <div id={idCaps} className="ax-login-hint" role="status" aria-live="polite">Caps Lock is ON</div>}
            {err && <div id={idErr} role="alert" aria-live="assertive" className="ax-login-error">{err}</div>}
          </div>

          <div className="ax-row ax-login-actions">
            <button type="button" className="ax-btn ghost" onClick={handleToggleMode} disabled={busy}>
              {mode === "login" ? "REQUEST ACCESS" : "BACK TO LOGIN"}
            </button>
            <button type="submit" className="ax-btn primary" disabled={busy}>
              {busy ? "CHECKING…" : mode === "login" ? "ENTRANCE" : "REGISTER"}
            </button>
          </div>

          <div className="ax-hr ax-hr--viktor slim" aria-hidden />
          <small className="ax-login-foot"><span className="ax-foot-box">AXIOM DESIGN © 2025 • RED PROTOCOL</span></small>
        </form>
      </div>

      {/* hover-reveal hint bar at the bottom (triggered by red pill) */}
      <div className="ax-bottom-hint" role="note" aria-label="AXIOM bottom hint">
        <button
          type="button"
          className="ax-bottom-hint__pill"
          aria-label="Show hint"
          // aria-expanded булев флаг потребует JS — оставляем без него
        />
        <div className="ax-bottom-hint__panel">
          <span className="ax-bottom-hint__brand">AXIOM SIGNAL © 2025 • RED PROTOCOL</span>
          <span className="ax-bottom-hint__sep"> </span>
          <span className="ax-bottom-hint__text">
            CHANNEL: LOGIN • STATUS: ONLINE • TIP: USE DEMO CREDS TO EXPLORE THE PANEL.
          </span>
        </div>
      </div>
    </section>
  );
}
// стили «RED PROTOCOL ACCESS GATEWAY» и нижней плашки применяются через CSS (см. login-bg.css)
