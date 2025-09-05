/*
  AXIOM PUBLIC DEMO UI — APP v1.0
  Логика SPA: Login → Main, Tabs (Roadmap/Audit/Content), манифесты, хоткеи, fullscreen.
  Зависит от разметки index.html и стилей из assets/css/*.
*/

(() => {
    'use strict';
  
    // ——— Config ———
    const CONFIG = {
      roadmapSrc: 'data/roadmap.html',            // копия AX.01/00_NAVIGATION/00.04.n_ROADMAP.html
      auditsManifest: 'data/audits/manifest.json',// [{ title, date, file }]
      contentManifest: 'data/content/manifest.json', // [{ title, group, file }]
      requirePassword: false,                     // включить проверку пароля в демо
      demoPassword: 'axiom'
    };
  
    // ——— Shorthands ———
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  
    // Точки DOM; инициализируем в boot() после DOMContentLoaded
    let E = {};
    function queryElements() {
      E = {
        views: { login: $('#login'), main: $('#main') },
        loginForm: $('#loginForm'),
        loginPw: $('#login-pw'),
        btnSkip: $('#btn-skip'),
        btnLogout: $('#btn-logout'),
        btnFullscreen: $('#btn-fullscreen'),
        tabs: {
          roadmap: $('#tab-roadmap'),
          audit: $('#tab-audit'),
          content: $('#tab-content')
        },
        panels: {
          roadmap: $('#panel-roadmap'),
          audit: $('#panel-audit'),
          content: $('#panel-content')
        },
        roadmapFrame: $('#roadmap-frame'),
        auditList: $('#audit-list'),
        auditFrame: $('#audit-frame'),
        auditPath: $('#audit-path'),
        contentList: $('#content-list'),
        contentFrame: $('#content-frame'),
        contentPath: $('#content-path'),
        contentSearch: $('#content-search')
      };
    }
  
    // ——— Auth ———
    function enterApp() {
      try { sessionStorage.setItem('axiom.demo.auth', '1'); } catch {}
      if (E.views.login) E.views.login.classList.add('hidden');
      if (E.views.main)  {
        E.views.main.classList.remove('hidden');
        E.views.main.setAttribute('aria-hidden', 'false');
      }
      if (E.roadmapFrame) E.roadmapFrame.src = CONFIG.roadmapSrc;
      loadAuditManifest();
      loadContentManifest();
      activateTab('roadmap');
    }
    function logout() {
      try { sessionStorage.removeItem('axiom.demo.auth'); } catch {}
      if (E.views.main)  E.views.main.classList.add('hidden');
      if (E.views.login) E.views.login.classList.remove('hidden');
      if (E.views.main)  E.views.main.setAttribute('aria-hidden', 'true');
    }
  
    // ——— Fullscreen ———
    async function toggleFullscreen() {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('[AXIOM] Fullscreen error:', e);
      }
    }
  
    // ——— Tabs ———
    function activateTab(id) {
      // id ∈ {'roadmap','audit','content'}
      Object.entries(E.tabs || {}).forEach(([key, el]) => {
        if (!el) return;
        const active = key === id;
        el.classList.toggle('active', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      Object.values(E.panels || {}).forEach(p => p && p.classList.remove('active'));
      if (E.panels && E.panels[id]) E.panels[id].classList.add('active');
    }
  
    // ——— Audit manifest ———
    async function loadAuditManifest() {
      if (!E.auditList) return;
      E.auditList.innerHTML = '';
      try {
        const res = await fetch(CONFIG.auditsManifest, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) {
          E.auditList.innerHTML = emptyMsg('Нет файлов аудита. Добавьте manifest.json + html-файлы.');
          if (E.auditFrame) E.auditFrame.src = 'about:blank';
          if (E.auditPath)  E.auditPath.textContent = 'data/audits/—';
          return;
        }
        items.forEach((it, idx) => {
          const btn = document.createElement('button');
          btn.className = 'item';
          btn.setAttribute('role', 'option');
          btn.innerHTML = `\n          <span class="title">${escapeHTML(it.title || 'Без названия')}</span>\n          <span class="meta">${escapeHTML(it.date || '')}</span>`;
          btn.addEventListener('click', () => openAudit(it.file, it.title));
          if (idx === 0) setTimeout(() => btn.click(), 0); // авто‑открытие первого
          E.auditList.appendChild(btn);
        });
      } catch (err) {
        E.auditList.innerHTML = errorMsg('Не удалось загрузить manifest.json для аудита.', err);
        if (E.auditFrame) E.auditFrame.src = 'about:blank';
        if (E.auditPath)  E.auditPath.textContent = 'data/audits/—';
      }
    }
    function openAudit(file, title) {
      const src = `data/audits/${file}`;
      if (E.auditFrame) E.auditFrame.src = src;
      if (E.auditPath)  E.auditPath.textContent = src;
      if (E.auditFrame) E.auditFrame.title = `Audit • ${title || file}`;
    }
  
    // ——— Content manifest ———
    let CONTENT_CACHE = [];
    async function loadContentManifest() {
      if (!E.contentList) return;
      E.contentList.innerHTML = '';
      try {
        const res = await fetch(CONFIG.contentManifest, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const items = await res.json();
        if (!Array.isArray(items) || items.length === 0) {
          E.contentList.innerHTML = emptyMsg('Пока нет контента. Добавьте manifest.json + html‑страницы.');
          if (E.contentFrame) E.contentFrame.src = 'about:blank';
          if (E.contentPath)  E.contentPath.textContent = 'data/content/—';
          CONTENT_CACHE = [];
          return;
        }
        CONTENT_CACHE = items;
        renderContentList(items);
      } catch (err) {
        E.contentList.innerHTML = errorMsg('Не удалось загрузить manifest.json для контента.', err);
        if (E.contentFrame) E.contentFrame.src = 'about:blank';
        if (E.contentPath)  E.contentPath.textContent = 'data/content/—';
        CONTENT_CACHE = [];
      }
    }
    function renderContentList(items) {
      if (!E.contentList) return;
      E.contentList.innerHTML = '';
      items.forEach((it, idx) => {
        const btn = document.createElement('button');
        btn.className = 'item';
        btn.setAttribute('role', 'option');
        btn.innerHTML = `\n        <span class="title">${escapeHTML(it.title || 'Без названия')}</span>\n        <span class="meta">${escapeHTML(it.group || '')}</span>`;
        btn.addEventListener('click', () => openContent(it.file, it.title));
        if (idx === 0) setTimeout(() => btn.click(), 0);
        E.contentList.appendChild(btn);
      });
    }
    function openContent(file, title) {
      const src = `data/content/${file}`;
      if (E.contentFrame) E.contentFrame.src = src;
      if (E.contentPath)  E.contentPath.textContent = src;
      if (E.contentFrame) E.contentFrame.title = `Content • ${title || file}`;
    }
  
    // ——— UI helpers ———
    function emptyMsg(text) {
      return `<div class="muted" style="padding:14px;">${escapeHTML(text)}</div>`;
    }
    function errorMsg(text, err) {
      const more = err ? `\n<pre class="muted" style="white-space:pre-wrap;">${escapeHTML(String(err))}</pre>` : '';
      return `<div style="padding:14px; border-left:3px solid var(--accent); background: rgba(255,32,52,.06);">${escapeHTML(text)}${more}</div>`;
    }
    function escapeHTML(s) {
      return String(s).replace(/[&<>"']/g, (m) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[m]);
    }
  
    // ——— Wiring ———
    function wireEvents() {
      // Tabs
      E.tabs.roadmap && E.tabs.roadmap.addEventListener('click', () => activateTab('roadmap'));
      E.tabs.audit   && E.tabs.audit.addEventListener('click',   () => activateTab('audit'));
      E.tabs.content && E.tabs.content.addEventListener('click', () => activateTab('content'));
  
      // Fullscreen
      E.btnFullscreen && E.btnFullscreen.addEventListener('click', toggleFullscreen);
  
      // Logout
      E.btnLogout && E.btnLogout.addEventListener('click', logout);
  
      // Keyboard
      document.addEventListener('keydown', (e) => {
        // F11 / Alt+Enter → fullscreen
        if (e.key === 'F11' || (e.key === 'Enter' && (e.altKey || e.metaKey))) {
          e.preventDefault();
          toggleFullscreen();
          return;
        }
        // Ctrl+K → фокус поиска контента
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          const search = E.contentSearch;
          if (search && !E.views.main?.classList.contains('hidden')) {
            e.preventDefault(); search.focus(); search.select();
          }
          return;
        }
        // Ctrl+1..3 → tabs
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
          if (e.key === '1') { e.preventDefault(); activateTab('roadmap'); return; }
          if (e.key === '2') { e.preventDefault(); activateTab('audit');   return; }
          if (e.key === '3') { e.preventDefault(); activateTab('content'); return; }
        }
      });
  
      // Login
      E.btnSkip && E.btnSkip.addEventListener('click', enterApp);
      E.loginForm && E.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (CONFIG.requirePassword) {
          const pw = (E.loginPw && E.loginPw.value) || '';
          if (pw !== CONFIG.demoPassword) {
            alert('Неверный пароль (демо)');
            return;
          }
        }
        enterApp();
      });
  
      // Content search
      E.contentSearch && E.contentSearch.addEventListener('input', (e) => {
        const q = (e.target.value || '').trim().toLowerCase();
        const filtered = !q ? CONTENT_CACHE : CONTENT_CACHE.filter(it =>
          (it.title || '').toLowerCase().includes(q) || (it.group || '').toLowerCase().includes(q)
        );
        renderContentList(filtered);
      });
    }
  
    // ——— Boot ———
    function boot() {
      queryElements();
      wireEvents();
      try {
        if (sessionStorage.getItem('axiom.demo.auth') === '1') {
          enterApp();
        }
      } catch {}
    }
  
    document.addEventListener('DOMContentLoaded', boot);
  })();
  