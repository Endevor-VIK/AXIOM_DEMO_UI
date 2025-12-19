// AXIOM_DEMO_UI — WEB CORE
// File: app/routes/login/page.tsx

import React, {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  hashPassword, verifyPassword, loadUsers, saveUser, type AuthUser,
} from "@/lib/auth";
import { loginDemo } from "@/lib/identity/authService";

import "@/styles/login-bg.css";
import "@/styles/login-cyber.css";

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

/* ---------- упрощённый «терминал» поверх фона ---------- */

type Preset = { title: string; lines: string[] };
const PRESETS: Preset[] = [
  { title: "OPS://AUTH_GATEWAY", lines: [
    "mesh: uplink ok • latency 5ms",
    "vault: checksum a1f • sealed",
    "ai: credentials required.",
  ]},
  { title: "NETSEC://WATCHDOG", lines: [
    "sentry: nodes 6/6 • green",
    "keys: rotation Δ+1",
    "ai: i see you, operative.",
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
  const [preset, setPreset] = useState<Preset>(PRESETS[0] ?? { title: "", lines: [] });
  const [typed, setTyped] = useState<string[]>(["", "", ""]);
  const typingTimer = useRef<number | null>(null);
  const cycleTimer = useRef<number | null>(null);

  // печать 3 коротких строк — лёгко и дёшево
  const startTyping = useCallback(() => {
    let li = 0, ci = 0;
    setTyped(["", "", ""]);
    if (typingTimer.current) { clearInterval(typingTimer.current); typingTimer.current = null; }
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
    }, 14);
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
        setPreset(PRESETS[idx] ?? { title: "", lines: [] });
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
        style={{ top, [side]: 24 } as React.CSSProperties}
      >
        <div className="ax-console__head">
          <span className="ax-console__title">{preset.title}</span>
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
        </div>
      </div>
      {/* лёгкие scanlines; эффекты строго под карточкой */}
      <div className="ax-cyber__scanlines" />
    </div>
  );
}
/* ---------- /overlay ---------- */

export default function LoginPage() {
  const nav = useNavigate();
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    document.body.classList.add("ax-no-scroll");
    return () => document.body.classList.remove("ax-no-scroll");
  }, []);

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
      loginDemo({
        id: `user-${user.toLowerCase()}`,
        displayName: user.toUpperCase(),
        handle: `@${user.toLowerCase()}`,
        role: "user",
      });
      nav("/dashboard", { replace: true });
    } catch (error: any) { setErr(error?.message || "Unable to authenticate"); } finally { setBusy(false); }
  }, [busy, login, password, mode, nav]);

  const cardClasses = ["ax-card", "low", "ax-login-card"];
  if (err) cardClasses.push("is-error");
  if (shake) cardClasses.push("is-shake");

  return (
    <section ref={rootRef} className="ax-login" aria-labelledby="login-title">
      {/* фон и кибер-слой строго позади карточки */}
      <div className="ax-login__bg" aria-hidden />
      <CyberDeckOverlay root={rootRef} />

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
