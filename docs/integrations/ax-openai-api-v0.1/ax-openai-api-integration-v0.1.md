<!--
AXS_HEADER_META:
  id: AXS.AXUI.DOCS_INTEGRATIONS_AX_OPENAI_API_V0_1_AX_OPENAI_API_INTEGRATION_V0_1_MD
  title: "AX_OPENAI_API_INTEGRATION_v0.1"
  status: ACTIVE
  mode: Doc
  goal: "Document"
  scope: "AXIOM WEB CORE UI"
  lang: ru
  last_updated: 2026-02-05
  editable_by_agents: true
  change_policy: "Update via AgentOps log"
-->

# AX_OPENAI_API_INTEGRATION_v0.1

> Полная документация по интеграции OpenAI API (GPT‑5 / GPT‑5‑mini) в AXIOM PANEL: сервер FastAPI со стримингом (SSE) + фронтенд‑клиент на TypeScript.

---

## META

* **PATH:** `docs/integrations/ax-openai-api-v0.1/ax-openai-api-integration-v0.1.md`
* **STATUS:** Draft → Ready‑to‑Use
* **OWNER:** CREATOR · AXIOM
* **LAST UPDATE:** 20.09.25
* **SCOPE:** Локальная разработка и продакшен‑внедрение

---

## 0. Кратко

* Бэкенд на **FastAPI** предоставляет два эндпоинта: `POST /api/chat` (одноразовый ответ) и `POST /api/chat/stream` (стриминг SSE по токенам).
* Фронтенд использует `app/services/ai.ts` для общения с этими эндпоинтами без экспонирования API‑ключа в браузер.
* Ключ хранится в **`.env` файле** в корне проекта, не коммитится.

---

## 1. Требования

* Python 3.10+
* Node 18+
* Аккаунт OpenAI с доступом к `gpt-5` / `gpt-5-mini`

---

## 2. Структура проекта (рекомендуемая)

```
Проект/
├─ .env                      # <— ФАЙЛ с ключами (не папка)
├─ .gitignore
├─ api/
│  └─ main.py                # FastAPI: /api/chat и /api/chat/stream (SSE)
├─ app/
│  ├─ main.tsx               # Вход фронта (Vite/React)
│  ├─ routes/                # Роуты/страницы
│  └─ services/
│     └─ ai.ts               # Клиент к /api/chat и /api/chat/stream
├─ assets/
├─ ax-design/
├─ components/
├─ dist/                     # Сборка фронта (генерируется)
├─ docs/
│  └─ ax-openai-api-integration-v0.1.md  # этот файл
├─ export/
├─ public/
├─ scripts/
│  └─ run_local.py           # (опционально) запуск/скрипты
├─ styles/
├─ tests/
├─ tools/
├─ package.json
├─ requirements.txt
└─ vite.config.ts
```

> Если у тебя существует **папка** `.env/` — удали/переименуй её и создай **файл** `.env` в корне.

---

## 3. Настройка окружения

### 3.1. `.env`

```dotenv
# === OpenAI ===
OPENAI_API_KEY=sk-ВАШ_КЛЮЧ_ЗДЕСЬ
# (опционально)
# OPENAI_ORG=org_xxxxx
# OPENAI_PROJECT=proj_xxxxx

# === CORS (опционально) ===
# CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3.2. Python-зависимости

`requirements.txt`

```
fastapi
uvicorn
openai
python-dotenv
```

Установка:

```bash
pip install -r requirements.txt
```

### 3.3. Vite прокси (dev)

`vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000", // прокси на FastAPI
    },
  },
});
```

---

## 4. Бэкенд API (FastAPI)

### 4.1. Запуск

```bash
uvicorn api.main:app --reload --port 8000
```

### 4.2. Эндпоинты

#### `POST /api/chat` — одноразовый ответ

**Request JSON**

```json
{
  "messages": [
    {"role": "system", "content": "Ты помощник по коду."},
    {"role": "user", "content": "Сделай рефакторинг этой функции..."}
  ],
  "model": "gpt-5-mini",
  "temperature": 0.7,
  "max_tokens": 1000,
  "verbosity": "medium",           // опц. (если включено в аккаунте)
  "reasoning_effort": "medium"      // опц. (если включено в аккаунте)
}
```

**Response JSON**

```json
{
  "content": "…текст ответа…",
  "usage": { "prompt_tokens": 123, "completion_tokens": 456, "total_tokens": 579 }
}
```

**cURL**

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
        "model":"gpt-5-mini",
        "messages":[
          {"role":"system","content":"Ты помощник по коду."},
          {"role":"user","content":"Скажи привет одним словом."}
        ]
      }'
```

#### `POST /api/chat/stream` — стриминг (SSE)

**Формат потока:** сервер шлёт строки вида `data: {"delta": "текст"}\n\n` для каждого нового токена и завершает `data: [DONE]\n\n`.

**cURL (наблюдать поток):**

```bash
curl -N -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
        "model":"gpt-5-mini",
        "messages":[
          {"role":"system","content":"Ты помощник по коду."},
          {"role":"user","content":"Сгенерируй 1 предложение."}
        ]
      }'
```

### 4.3. Контракты (схемы)

```ts
// role в сообщениях
export type Role = "system" | "user" | "assistant" | "tool";

// тело запроса
interface ChatRequest {
  messages: { role: Role; content: string }[];
  model?: "gpt-5" | "gpt-5-mini";
  temperature?: number;
  max_tokens?: number;
  verbosity?: "low" | "medium" | "high";        // опционально
  reasoning_effort?: "minimal" | "medium" | "high"; // опционально
}
```

### 4.4. Ошибки и обработка

* `429 Rate limit` — экспоненциальный бэкофф в стрим‑обработчике; для нестримового эндпоинта рекомендуется повтор с задержкой.
* `401/403` — проверь `OPENAI_API_KEY` и права проекта/организации.
* `500` — системные/сетевые ошибки, логировать стек и тело ответа (без чувствительных данных).

### 4.5. CORS

В `api/main.py` разрешены dev‑домены: `http://localhost:5173`, `http://127.0.0.1:5173`.
Для продакшена — укажи свои домены. Можно читать список из `CORS_ORIGINS` в `.env` (разделять запятыми).

---

## 5. Фронтенд интеграция (TypeScript)

### 5.1. Клиент‑обёртка `app/services/ai.ts`

```ts
export type Role = "system" | "user" | "assistant" | "tool";

export interface ChatMessage { role: Role; content: string }
export interface ChatRequest {
  messages: ChatMessage[];
  model?: "gpt-5" | "gpt-5-mini";
  temperature?: number;
  max_tokens?: number;
  verbosity?: "low" | "medium" | "high";
  reasoning_effort?: "minimal" | "medium" | "high";
}

export async function chatOnce(payload: ChatRequest): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.content as string;
}

export async function* chatStream(payload: ChatRequest): AsyncGenerator<string> {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.body) throw new Error("No stream body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      if (!part.startsWith("data:")) continue;
      const json = part.replace(/^data:\s*/, "");
      if (json === "[DONE]") return;
      try {
        const obj = JSON.parse(json);
        if (obj.delta) yield obj.delta as string;
        if (obj.error) throw new Error(obj.error);
      } catch {}
    }
  }
}
```

### 5.2. Пример использования в React

```tsx
import { useState } from "react";
import { chatStream, ChatMessage } from "../services/ai";

export default function ChatPanel() {
  const [text, setText] = useState("");
  const [out, setOut] = useState("");

  async function send() {
    setOut("");
    const messages: ChatMessage[] = [
      { role: "system", content: "Ты — AXIOM PANEL Assistant. Отвечай сжато, без эмодзи." },
      { role: "user", content: text },
    ];
    for await (const chunk of chatStream({ messages, model: "gpt-5-mini", temperature: 0.3 })) {
      setOut(prev => prev + chunk);
    }
  }

  return (
    <div>
      <textarea value={text} onChange={e => setText(e.target.value)} />
      <button onClick={send}>Send</button>
      <pre>{out}</pre>
    </div>
  );
}
```

---

## 6. Поток разработки (dev)

1. Создай файл `.env` и вставь `OPENAI_API_KEY`.
2. `pip install -r requirements.txt`
3. `uvicorn api.main:app --reload --port 8000`
4. `npm install && npm run dev`
5. Открой `http://localhost:5173` и протестируй чат.

Smoke‑тесты cURL см. в разделе 4.2.

---

## 7. Продакшен‑внедрение

### 7.1. Uvicorn/Gunicorn + reverse proxy

* Запускай FastAPI через **gunicorn** с воркером uvicorn или напрямую uvicorn.
* Держи процесс под **systemd** или в **Docker**.

**systemd unit (пример):**

```ini
[Unit]
Description=AXIOM AI API
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/axiom
EnvironmentFile=/var/www/axiom/.env
ExecStart=/usr/bin/python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### 7.2. Nginx (важно для SSE)

```nginx
server {
  listen 80;
  server_name axiom.example.com;

  location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    # Критично для SSE
    proxy_buffering off;
    proxy_read_timeout 3600s;
    add_header X-Accel-Buffering no;
  }

  location / {
    root /var/www/axiom/dist; # сборка фронта
    try_files $uri /index.html;
  }
}
```

> Для Caddy/Traefik — аналогично: отключить буферизацию и увеличить timeout.

### 7.3. Безопасность

* Ключи только в `.env` на сервере, доступ ограничен пользователю сервиса.
* Разрешай CORS только для доверенных доменов.
* Логируй ошибки без утечек конфиденциальных данных.
* Настрой ротацию ключа и мониторинг 4xx/5xx.

---

## 8. Тестирование

* **Unit:** мокай клиент OpenAI и проверяй сериализацию `ChatRequest`.
* **Интеграционные:** энд‑ту‑энд вызовы `/api/chat` и парсинг SSE из `/api/chat/stream`.
* **Нагрузочные:** короткие запросы `gpt-5-mini` для оценки пропускной.

---

## 9. Устранение неполадок (FAQ)

* **`401/403`**: проверь `OPENAI_API_KEY` и права проекта; убедись, что файл `.env` — в корне и читается.
* **`429`**: добавь ретраи/квоты; уменьшай частоту запросов; проверь параллелизм.
* **SSE «не стримит»**:

  * На проде отключи буферизацию реверс‑прокси (`proxy_buffering off`, `X-Accel-Buffering no`).
  * Проверь, что фронт не использует `fetch` с кэшированием или сервис‑воркером, который буферизует.
* **CORS ошибки**: добавь правильные домены в CORS‑мидлварь.
* **Папка `.env/` вместо файла**: `python-dotenv` не найдёт ключ. Нужен файл `.env`.

---

## 10. Версионирование / CHANGELOG

* **v0.1** — первичная интеграция: FastAPI + SSE, TS‑клиент, dev‑прокси, прод‑рекомендации, Nginx‑настройки.

---

## 11. Дальнейшие улучшения (Backlog)

* [ ] Перенести список CORS‑доменов в `.env` и парсить в `api/main.py`.
* [ ] Централизованный логгер + трейс‑ID для запросов.
* [ ] Ограничение длины истории и токен‑квот на пользователя.
* [ ] Поддержка **Embeddings** и **Files API** (серверные маршруты‑врапперы).
* [ ] Маршрут `/api/health` и pro‑метрики (Prometheus).
* [ ] Dockerfile + compose (Nginx + API + фронт).

---

## 12. Приложение: контрольный список внедрения

1. Создать файл `.env` и вставить `OPENAI_API_KEY`.
2. `pip install -r requirements.txt`
3. Запустить API: `uvicorn api.main:app --reload --port 8000`
4. `npm install && npm run dev`
5. Проверить `/api/chat` и `/api/chat/stream` (cURL + UI).
6. Настроить Nginx/Caddy для продакшена (SSE без буферов).
7. Ограничи CORS доменами продакшена.

---

**Готово.** Этот документ можно хранить в `docs/` и обновлять по мере развития интеграции.
