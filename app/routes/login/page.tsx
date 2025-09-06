// AXIOM_DEMO_UI — WEB CORE
// Canvas: C11 — app/routes/login/page.tsx
// Purpose: Strict login (no hotkey hints), optional registration, token storage; redirects to /dashboard on success.

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hashPassword, verifyPassword, loadUsers, saveUser, type AuthUser } from '@/lib/auth';

export default function LoginPage(){
  const nav = useNavigate();
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const title = mode === 'login' ? 'Вход' : 'Регистрация';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      if (mode === 'register') {
        const exists = (await loadUsers()).find(u => u.login === login);
        if (exists) throw new Error('Пользователь уже существует');
        const hashed = await hashPassword(password);
        const user: AuthUser = { login, password: hashed, createdAt: new Date().toISOString() };
        await saveUser(user);
      } else {
        const users = await loadUsers();
        const user = users.find(u => u.login === login);
        if (!user) throw new Error('Неверные учётные данные');
        const ok = await verifyPassword(password, user.password);
        if (!ok) throw new Error('Неверные учётные данные');
      }
      localStorage.setItem('axiom.auth', JSON.stringify({ login, ts: Date.now() }));
      nav('/dashboard', { replace: true });
    } catch (e:any) {
      setErr(e?.message || 'Ошибка входа');
    } finally {
      setBusy(false);
    }
  }, [busy, login, password, mode, nav]);

  return (
    <div className="container">
      <form className="ax-form" onSubmit={handleSubmit} aria-busy={busy} aria-describedby={err ? 'login-error' : undefined}>
        <h2>{title}</h2>
        <div className="ax-field">
          <label className="ax-label" htmlFor="login">Логин</label>
          <input id="login" className="ax-input" value={login} onChange={e=>setLogin(e.target.value)} autoComplete="username" required />
        </div>
        <div className="ax-field">
          <label className="ax-label" htmlFor="password">Пароль</label>
          <input id="password" className="ax-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
        </div>
        {err && <div id="login-error" role="alert" className="ax-err">{err}</div>}
        <div className="ax-actions-row">
          <button type="button" className="ax-btn" onClick={()=>setMode(mode==='login'?'register':'login')}>
            {mode==='login' ? 'Регистрация' : 'Назад к входу'}
          </button>
          <button type="submit" className="ax-btn primary" disabled={busy}>{mode==='login'?'Войти':'Зарегистрироваться'}</button>
        </div>
        <div className="hr" />
        <small>Подсказки хоткеев отключены. Вход только по логину и паролю.</small>
      </form>
    </div>
  );
}
