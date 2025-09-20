// AXIOM_DEMO_UI — WEB CORE
// File: app/routes/login/page.tsx

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  hashPassword, verifyPassword, loadUsers, saveUser, type AuthUser,
} from "@/lib/auth";

import "@/styles/login-bg.css";     // фон
import "@/styles/login-cyber.css";  // кибер-оверлей

type Mode = "login" | "register";

const TITLES: Record<Mode, string> = {
  login: "WELCOME TO AXIOM PANEL",
  register: "REGISTER NEW OPERATIVE",
};
const SUBTITLES: Record<Mode, string> = {
  login: "RED PROTOCOL ACCESS GATEWAY",
  register: "PROVISION ACCESS KEY",
};

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

/* ---------------- CYBER OVERLAY ---------------- */

function useReducedMotion() {
  const [pref, setPref] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setPref(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);
  return pref;
}

type ConsolePreset = { title: string; lines: string[] };

const PRESETS: ConsolePreset[] = [
  {
    title: "NETSEC://INTRUSION_MONITOR",
    lines: [
      "watchdog: integrity_ok",
      "vault: checksum 0xA1F • sealed",
      "secmesh: uplink=stable latency=4ms",
      "ai: hello, operative. keep quiet.",
    ],
  },
  {
    title: "OPS://TELEMETRY",
    lines: [
      "core-temp 43.7°C • fans=quiet",
      "quantum-slot #2 idle • standby",
      "logistics: convoy ALFA synced",
      "ai: i see you. credentials, please.",
    ],
  },
  {
    title: "BLACKBOX://WHISPER",
    lines: [
      "entropy rising • signal: clean",
      "sentry keys rotated (Δ+1)",
      "mirror nodes: 6/6 handshake ok",
      "ai: don't blink.",
    ],
  },
];

function rand(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function CyberDeckOverlay() {
  const reduced = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [side, setSide] = useState<"left" | "right">("left");
  const [top, setTop] = useState(120);
  const [preset, setPreset] = useState<ConsolePreset>(PRESETS[0] ?? { title: "", lines: [] });
  const lineRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const typeLine = useCallback(
    async (el: HTMLSpanElement | null, text: string, speed = 14) => {
      if (!el) return;
      el.textContent = "";
      for (let i = 0; i < text.length; i++) {
        el.textContent += text[i];
        await new Promise((r) => setTimeout(r, speed + rand(0, 25)));
      }
    },
    []
  );

  const runTyping = useCallback(async () => {
    for (let i = 0; i < preset.lines.length; i++) {
      const span = lineRefs.current[i];
      if (span) {
        await typeLine(span, preset.lines[i] ?? "", 10 + rand(0, 12));
        await new Promise((r) => setTimeout(r, 80 + rand(0, 150)));
      }
    }
  }, [preset, typeLine]);

  // цикл случайных показов
  useEffect(() => {
    if (reduced) return; // уважаем reduced motion

    let showTimer: number | undefined;
    let hideTimer: number | undefined;

    const schedule = () => {
      showTimer = window.setTimeout(async () => {
        const idx = PRESETS.length > 0 ? rand(0, PRESETS.length - 1) : 0;
        setPreset(PRESETS[idx] ?? { title: "", lines: [] });
        setSide(Math.random() > 0.5 ? "left" : "right");
        setTop(rand(100, 260)); // позиция по высоте
        setVisible(true);

        document.body.classList.add("ax-glitch");
        setTimeout(() => document.body.classList.remove("ax-glitch"), 220);

        await new Promise((r) => setTimeout(r, 120));
        runTyping();

        hideTimer = window.setTimeout(() => {
          setVisible(false);
          schedule(); // планируем следующее появление
        }, rand(4000, 7000));
      }, rand(6000, 14000)); // пауза между появлениями
    };

    schedule();
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [reduced, runTyping]);

  return (
    <div className="ax-cyber" aria-hidden>
      <div
        className={`ax-console ${visible ? "is-show" : ""}`}
        style={{ top: `${top}px`, [side]: "24px" } as React.CSSProperties}
      >
        <div className="ax-console__head">
          <span className="ax-led ax-led--red" />
          <span className="ax-led ax-led--green" />
          <span className="ax-console__title">{preset.title}</span>
        </div>
        <div className="ax-console__body">
          <pre className="ax-console__pre">
            {preset.lines.map((_, i) => (
              <div key={i} className="ax-console__line">
                <span className="ax-console__prompt">›</span>
                <span
                  ref={(el) => (lineRefs.current[i] = el)}
                  className="ax-console__typed"
                />
                <span className="ax-console__cursor" />
              </div>
            ))}
          </pre>
        </div>
      </div>

      {/* скан-линии + шум поверх сцены (не трогают карточку) */}
      <div className="ax-cyber__scanlines" />
      <div className="ax-cyber__noise" />
    </div>
  );
}

/* ---------------- LOGIN PAGE (как было) ---------------- */

function safeSetAuth(payload: unknown) {
  try { localStorage.setItem("axiom.auth", JSON.stringify(payload)); } catch {}
}

export default function LoginPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [login, setLogin] = useState("");
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
    const user = login.trim(); const key = password;
    try {
      if (!user || !key) throw new Error("Fill both fields");
      if (mode === "register") {
        const exists = (await loadUsers()).find((u) => u.login === user);
        if (exists) throw new Error("User already exists");
        const hashed = await hashPassword(key);
        const newUser: AuthUser = { login: user, password: hashed, createdAt: new Date().toISOString() };
        await saveUser(newUser);
      } else {
        const users = await loadUsers(); const found = users.find((u) => u.login === user);
        if (!found) throw new Error("Invalid credentials");
        const ok = await verifyPassword(key, found.password);
        if (!ok) throw new Error("Invalid credentials");
      }
      safeSetAuth({ login: user, ts: Date.now() }); nav("/dashboard", { replace: true });
    } catch (error: any) { setErr(error?.message || "Unable to authenticate"); } finally { setBusy(false); }
  }, [busy, login, password, mode, nav]);

  const cardClasses = ["ax-card", "low", "ax-login-card"]; if (err) cardClasses.push("is-error"); if (shake) cardClasses.push("is-shake");

  return (
    <section className="ax-login ax-section" aria-labelledby="login-title">
      <div className="ax-login__bg" aria-hidden />
      {/* ⬇️ КИБЕР-ОВЕРЛЕЙ: живые эффекты вокруг карточки */}
      <CyberDeckOverlay />

      <div className="ax-container">
        <form className={cardClasses.join(" ")} onSubmit={handleSubmit} aria-busy={busy} noValidate>
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
              value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" aria-invalid={err ? "true" : undefined} disabled={busy} />
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
    </section>
  );
}
