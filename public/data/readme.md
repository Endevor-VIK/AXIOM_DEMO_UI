<!-- AXIOM_DEMO_UI — WEB CORE | Canvas: C27 — public/data snapshot -->

# C27 — `public/data/*` (starter snapshot)

> Назначение: минимальный набор файлов и данных для работы VFS/панелей (Roadmap, Audit, Content, News) и экрана TerminalBoot.
> Размещение: **`public/data/`** в корне проекта.
> Примечание: данные **публичные**. Не класть секреты, токены, пути машины.

---

## Дерево (минимум)

```txt
public/data/
├─ index.json
├─ objects.json
├─ logs.json
├─ roadmap/
│  └─ index.html
├─ audits/
│  ├─ manifest.json
│  └─ 2025-09-06__audit-demo.html
├─ content/
│  ├─ manifest.json
│  └─ 2025-09-06__content-demo.html
└─ news/
   ├─ manifest.json
   └─ items/
      └─ 2025-09-06-webcore.md
```

---

## Файлы (готовые шаблоны)

### `public/data/index.json`

```json
{
  "meta": {
    "version": "v1",
    "generatedAt": "2025-09-06T00:00:00Z",
    "zone": "[11_SYSTEM_INTERFACE]"
  },
  "zones": ["00_NAVIGATION", "11_SYSTEM_INTERFACE", "19_CHANGELOG"]
}
```

### `public/data/objects.json`

```json
{
  "objects": [
    { "id": "roadmap", "path": "roadmap/index.html", "type": "html" },
    { "id": "audit.demo", "path": "audits/2025-09-06__audit-demo.html", "type": "html" },
    { "id": "content.demo", "path": "content/2025-09-06__content-demo.html", "type": "html" }
  ]
}
```

### `public/data/logs.json`

```json
{
  "logs": [
    { "ts": "2025-09-06T06:00:00Z", "level": "info", "msg": "WEB CORE bootstrap" },
    { "ts": "2025-09-06T06:01:00Z", "level": "ok",   "msg": "Snapshots available (index, objects, logs)" },
    { "ts": "2025-09-06T06:02:00Z", "level": "ok",   "msg": "Manifests available (audits, content, news)" }
  ]
}
```

### `public/data/roadmap/index.html`

```html
<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AXIOM — Roadmap (demo)</title>
<style>body{background:#0c0d11;color:#ececf2;font:16px/1.55 ui-sans-serif,system-ui;padding:16px}a{color:#00e7ff}</style>
<h1>Roadmap (demo)</h1>
<p>Этот файл отрисовывается во вкладке <strong>Roadmap</strong> через <code>&lt;iframe&gt;</code>.</p>
<ul>
  <li>Фаза 0 — Skeleton (TerminalBoot, Login, Layout)</li>
  <li>Фаза 1 — News/Audit/Content</li>
  <li>Фаза 2 — Export/Redactor/Whitelist</li>
</ul>
```

### `public/data/audits/manifest.json`

```json
[
  {
    "title": "Аудит демо: структура данных",
    "date": "2025-09-06",
    "file": "audits/2025-09-06__audit-demo.html"
  }
]
```

### `public/data/audits/2025-09-06__audit-demo.html`

```html
<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audit Demo</title>
<style>body{background:#0c0d11;color:#ececf2;font:16px/1.55 ui-sans-serif,system-ui;padding:16px}code{color:#00e7ff}</style>
<h1>Audit — Demo</h1>
<p>Проверка чтения и предпросмотра HTML-файлов через iframe.</p>
<p>Файл расположен по пути: <code>public/data/audits/2025-09-06__audit-demo.html</code></p>
```

### `public/data/content/manifest.json`

```json
[
  {
    "title": "Content демо: приветствие",
    "date": "2025-09-06",
    "tags": ["intro","demo"],
    "file": "content/2025-09-06__content-demo.html"
  }
]
```

### `public/data/content/2025-09-06__content-demo.html`

```html
<!doctype html>
<html lang="ru">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Content Demo</title>
<style>body{background:#0c0d11;color:#ececf2;font:16px/1.55 ui-sans-serif,system-ui;padding:16px}a{color:#00e7ff}</style>
<h1>Добро пожаловать в AXIOM_DEMO_UI</h1>
<p>Этот контент отображается во вкладке <strong>Content</strong>. Можно добавлять больше элементов в <code>content/manifest.json</code>.</p>
```

### `public/data/news/manifest.json`

```json
[
  {
    "id": "2025-09-06-webcore",
    "date": "2025-09-06",
    "title": "WEB CORE: старт работ",
    "kind": "update",
    "tags": ["webcore","release"],
    "summary": "Инициализация архитектуры, терминальная загрузка, строгий логин.",
    "link": "/dashboard/news"
  },
  {
    "id": "2025-09-06-roadmap",
    "date": "2025-09-06",
    "title": "Roadmap: добавлен iframe-рендер",
    "kind": "update",
    "tags": ["roadmap","ui"],
    "summary": "Страница Roadmap теперь рендерит HTML из data/roadmap/index.html",
    "link": "/dashboard/roadmap"
  }
]
```

### `public/data/news/items/2025-09-06-webcore.md`

```md
# WEB CORE: старт работ

Мы запустили каркас новой архитектуры: TerminalBoot → Login → Dashboard, плюс лента новостей и базовые панели.

**Что нового**
- Терминальная загрузка и проверка снапшотов
- Строгий вход с регистрацией
- Панели Roadmap, Audit, Content, News

_Дата: 2025-09-06_
```

---

## Инструкции по редактированию

* **Добавить новость**: внесите запись в `news/manifest.json` (поля `id,date,title,kind,tags?,summary?,link?`) и при необходимости отдельный файл в `news/items/*.md`.
* **Добавить пункт аудита/контента**: добавьте объект в соответствующий `manifest.json` и положите файл по указанному пути.
* **Совместимость**: HTML-файлы предпросматриваются через iframe; `.md/.txt` пока открываются как прямые ссылки.
* **Безопасность**: не храните секреты/внутренние пути; все файлы публикуются как есть.

---

## Проверка (smoke)

1. TerminalBoot должен показать сообщения об успешной загрузке снапшотов и манифестов.
2. Roadmap — отображает содержимое `roadmap/index.html`.
3. Audit/Content —  по одному элементу в списках; предпросмотр работает.
4. News — на странице и в Ticker видны 1–2 записи.
