// AXIOM_DEMO_UI — WEB CORE
// Canvas: C11 - app/routes/login/page.tsx
// Purpose: RED PROTOCOL login with emblem, dual-mode (login/register),
// compact a11y-first form, shake-on-error, reduced-motion support.
// Deps: react, react-router-dom, '@/lib/auth' (hash/verify/load/save)

import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { hashPassword, verifyPassword, loadUsers, saveUser, type AuthUser } from "@/lib/auth";

// ⬇️ важно: подключаем фон отдельно
import "@/styles/login-bg.css";

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

  const idUser = useId();
  const idKey = useId();
  const idErr = useId();
  const idCaps = useId();

  useEffect(() => {
    if (!err) return;
    setShake(true);
    const t = setTimeout(() => setShake(false), 420);
    return () => clearTimeout(t);
  }, [err]);

  const handleToggleMode = useCallback(() => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setErr(null);
    setPassword("");
  }, []);

  const handleCaps = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // @ts-ignore
    const on = typeof e.getModifierState === "function" && e.getModifierState("CapsLock");
    setCaps(Boolean(on));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const user = login.trim();
    const key = password;

    try {
      if (!user || !key) throw new Error("Fill both fields");

      if (mode === "register") {
        const exists = (await loadUsers()).find((u) => u.login === user);
        if (exists) throw new Error("User already exists");
        const hashed = await hashPassword(key);
        const newUser: AuthUser = { login: user, password: hashed, createdAt: new Date().toISOString() };
        await saveUser(newUser);
      } else {
        const users = await loadUsers();
        const found = users.find((u) => u.login === user);
        if (!found) throw new Error("Invalid credentials");
        const ok = await verifyPassword(key, found.password);
        if (!ok) throw new Error("Invalid credentials");
      }

      safeSetAuth({ login: user, ts: Date.now() });
      nav("/dashboard", { replace: true });
    } catch (error: any) {
      setErr(error?.message || "Unable to authenticate");
    } finally {
      setBusy(false);
    }
  }, [busy, login, password, mode, nav]);

  const cardClasses = ["ax-card", "low", "ax-login-card"];
  if (err) cardClasses.push("is-error");
  if (shake) cardClasses.push("is-shake");

  return (
    <section className="ax-login ax-section" aria-labelledby="login-title">
      {/* independent layered background (edited in styles/login-bg.css) */}
      <div className="ax-login__bg" aria-hidden />

      <div className="ax-container">
        <form className={cardClasses.join(" ")} onSubmit={handleSubmit} aria-busy={busy} noValidate>
          {/* HEAD */}
          <div className="ax-login-head">
            <div className="ax-login-emblem" aria-hidden><SealDisk /></div>
            <h1 id="login-title" className="ax-blade-head">{title}</h1>
            {/* Viktor blade HR */}
            <div className="ax-hr ax-hr--viktor" aria-hidden />
            <p className="ax-login-sub">{subtitle}</p>
            <div className="ax-login-meta">
              <span className="ax-chip" data-variant={chipVariant}>{chipLabel}</span>
              <span className="ax-chip" data-variant="level">RED PROTOCOL</span>
            </div>
          </div>

          {/* FIELDS */}
          <div className="ax-login-fields ax-stack-sm" aria-describedby={err ? idErr : caps ? idCaps : undefined}>
            <label className="ax-visually-hidden" htmlFor={idUser}>User ID</label>
            <input
              id={idUser}
              className={`ax-input${err ? " is-invalid" : ""}`}
              name="user"
              placeholder="USER ID"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              aria-invalid={err ? "true" : undefined}
              disabled={busy}
            />
            <label className="ax-visually-hidden" htmlFor={idKey}>Access Key</label>
            <input
              id={idKey}
              className={`ax-input${err ? " is-invalid" : ""}`}
              name="key"
              placeholder="ACCESS KEY"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={handleCaps}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              aria-invalid={err ? "true" : undefined}
              disabled={busy}
            />
            {caps && !err && <div id={idCaps} className="ax-login-hint" role="status" aria-live="polite">Caps Lock is ON</div>}
            {err && <div id={idErr} role="alert" aria-live="assertive" className="ax-login-error">{err}</div>}
          </div>

          {/* ACTIONS */}
          <div className="ax-row ax-login-actions">
            <button type="button" className="ax-btn ghost" onClick={handleToggleMode} disabled={busy}>
              {mode === "login" ? "REQUEST ACCESS" : "BACK TO LOGIN"}
            </button>
            <button type="submit" className="ax-btn primary" disabled={busy}>
              {busy ? "CHECKING…" : mode === "login" ? "ENTRANCE" : "REGISTER"}
            </button>
          </div>

          <div className="ax-hr ax-hr--viktor slim" aria-hidden />
          <small className="ax-login-foot">
            <span className="ax-foot-box">AXIOM DESIGN © 2025 • RED PROTOCOL</span>
          </small>
        </form>
      </div>

      {/* bottom dock (raised from OS taskbar) */}
      <div className="ax-dock" role="complementary" aria-label="Axiom watermark dock">
        <button className="ax-dock__handle" type="button" aria-label="Open watermark panel" />
        <div className="ax-dock__panel">
          <div className="ax-dock__brand">AXIOM DESIGN © 2025 • RED PROTOCOL</div>
          <div className="ax-dock__note">Channel: LOGIN • Status: ONLINE • Tip: Use demo creds to explore the panel.</div>
        </div>
      </div>
    </section>
  );
}
