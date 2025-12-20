# AXIOM — Binary Background Layer (Spec v1.1)

**Цель.** Добавить «2‑й слой» — почти прозрачный бинарный поток под верхним чёрным слоем и над фоном карточки, без влияния на интерактив. Слой применяется к статус‑карточкам (RouteWreath) на вкладках **AUDIT / CONTENT / NEWS**. Анимация медленная, бесшовная, GPU‑дружелюбная, с авто‑регенерацией при изменении данных.

<!-- file: docs/specs/binary-background/binary-background-spec.md -->

---

## 1) Архитектура слоя

**Слои (z‑index):**

1. Базовый фон панели / карточки (чёрный слой проекта).
2. **BinaryBackground** (`.ax-binary`) — наш полупрозрачный фон.
3. Контент карточки RouteWreath (заголовок, описание, круглый индикатор).

**Принципы:**

* `pointer-events: none` у фонового слоя.
* Анимация только `transform: translateX` (GPU).
* Бесшовность за счёт дублирования трека (2 чанка).
* Фон «шифруется» от состояния страницы: значение счётчика, длина текстов блока, `document.lastModified`.
* Поддержка `prefers-reduced-motion: reduce`.

---

## 2) Изменения в проекте (файлы)

**Добавить:**

* `app/styles/ax-binary-bg.css`
* `app/components/ux/ax-binary-bg.ts`

**Модифицировать:**

* `app/main.tsx` — импорт CSS и `autoInitBinaryBackground()`
* Маршруты панели:

  * `app/routes/dashboard/audit/index.tsx`
  * `app/routes/dashboard/content/index.tsx`
  * `app/routes/dashboard/news/index.tsx`

(Если пути отличаются — применить аналогично в актуальных файлах маршрутов.)

---

## 3) Публичный API слоя

**Data‑атрибуты хоста:**

* `data-binary-bg` — пометить контейнер, к которому нужно добавить фон.
* `data-count-source="<CSS selector>"` — селектор элемента с числом (строка/атрибут), от которого сидируется поток.
* `data-count-attr="data-value"` *(опционально)* — если число лежит в атрибуте.
* `data-binary-clip="<px>"` *(опционально)* — отступ справа для обтекания круглого индикатора маской.

**Функции TS:**

* `initBinaryBackground(host: HTMLElement, seedSource?) => disposer`
* `autoInitBinaryBackground()` — авто‑инициализация по `data-binary-bg` (использовать в `main.tsx`).

---

## 4) CSS (app/styles/ax-binary-bg.css)

```css
:root{
  --ax-bg:#0B0C0E;
  --ax-red:#E14747;
  --ax-red-soft: rgba(225,71,71,.18);
}

/* Хост-контейнер */
[data-binary-bg]{ position: relative; overflow: hidden; }

/* Слой фона */
.ax-binary{
  position:absolute; inset:0; z-index:1; pointer-events:none;
  background: radial-gradient(120% 80% at 50% 50%, transparent 0%, transparent 55%, rgba(0,0,0,.18) 100%);
  -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%);
  contain: layout paint;
}

/* Индивидуальная обтечка справа через data-binary-clip */
[data-binary-bg][data-binary-clip] .ax-binary{
  /* безопасный inset; JS запишет точное значение через style.clipPath */
}

.ax-binary__line{
  position:absolute; left:-25vw; top:var(--y,50%); transform:translateY(-50%);
  color:var(--ax-red-soft); opacity:.085;
  font:700 clamp(18px,3.2vw,44px)/1.05 ui-monospace, "JetBrains Mono", SFMono-Regular, Menlo, Consolas, monospace;
  letter-spacing:.06em;
  filter:saturate(110%) contrast(110%);
  text-shadow:0 0 22px rgba(225,71,71,.05);
}

.ax-binary__track{ display:inline-block; white-space:nowrap; will-change:transform;
  animation:ax-marquee var(--dur,120s) linear infinite; transform:translate3d(0,0,0);
}
.ax-binary__line[data-dir="-1"] .ax-binary__track{ animation-direction:reverse; }
.ax-binary__chunk{ padding-right:10ch; }

@keyframes ax-marquee{ to{ transform: translateX(-50%); } }

/* Hover-реакция без событий мыши на фоне */
[data-binary-bg]:hover .ax-binary__line{ opacity:.11; }
[data-binary-bg]:hover .ax-binary__track{ animation-duration: calc(var(--dur,120s)*.9); }

@media (prefers-reduced-motion: reduce){
  .ax-binary__track{ animation-duration: 999s !important; }
}
```

---

## 5) TS‑модуль (app/components/ux/ax-binary-bg.ts)

```ts
// AXIOM • Binary Background
export type SeedSource = { el?: Element|null; attr?: string; extraMix?: string };

const xs32 = (seed:number)=>()=> (seed^=seed<<13, seed^=seed>>>17, seed^=seed<<5, seed>>>0);
function fnv1a(s:string){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h>>>0; }
function makeBits(len:number,r:()=>number){ let s=""; for(let i=0;i<len;i++) s += (r()&1)?"1":"0"; return s; }

function seedFrom(host:HTMLElement, src?:SeedSource){
  const textLen = host.textContent?.length ?? 0;
  const fromSel = src?.el ? (src.attr ? (src.el as HTMLElement).getAttribute(src.attr)||"" : src.el.textContent||"") : "";
  const mix = `${fromSel}|${textLen}|${document.lastModified}|${src?.extraMix||""}`;
  return fnv1a(mix);
}

function makeLine(y:string, dur:string, dir?:-1|1){
  const line = document.createElement('div');
  line.className='ax-binary__line';
  line.style.setProperty('--y', y);
  line.style.setProperty('--dur', dur);
  if(dir===-1) line.setAttribute('data-dir','-1');
  const track = document.createElement('span'); track.className='ax-binary__track';
  const c1 = document.createElement('span'); c1.className='ax-binary__chunk';
  const c2 = document.createElement('span'); c2.className='ax-binary__chunk';
  track.append(c1,c2); line.append(track);
  return { line, track, chunks:[c1,c2] };
}

export function initBinaryBackground(host:HTMLElement, seedSrc?:SeedSource){
  let layer = host.querySelector<HTMLElement>('.ax-binary');
  if(!layer){ layer=document.createElement('div'); layer.className='ax-binary'; host.prepend(layer); }

  // Ленты (позиция/скорость)
  const spec=[ {y:'22%', dur:'110s', dir:1 as 1}, {y:'48%', dur:'95s', dir:-1 as -1}, {y:'74%', dur:'130s', dir:1 as 1} ];
  layer.innerHTML='';
  const lines = spec.map(s=> makeLine(s.y, s.dur, s.dir));
  lines.forEach(l=> layer!.append(l.line));

  // Обтекание правого индикатора (по атрибуту)
  const clip = host.getAttribute('data-binary-clip');
  if(clip) layer!.style.clipPath = `inset(0 ${clip} 0 0 round 18px)`;

  const render=(mix="")=>{
    const seed = seedFrom(host, { ...seedSrc, extraMix:mix });
    lines.forEach((l,i)=>{ const r=xs32(seed+i*12345); const bits=makeBits(8000,r); l.chunks.forEach(c=> c.textContent=bits); });
  };
  render();

  const target = seedSrc?.el ?? host;
  const mo = new MutationObserver(()=> render(String(Date.now()&0xffff)));
  mo.observe(target, { subtree:true, childList:true, characterData:true, attributes:true });
  const iv = setInterval(()=> render(String(Date.now()&0xffff)), 60000);

  return ()=>{ mo.disconnect(); clearInterval(iv); };
}

export function autoInitBinaryBackground(){
  document.querySelectorAll<HTMLElement>('[data-binary-bg]').forEach(host=>{
    const selector = host.getAttribute('data-count-source')||'';
    const attr = host.getAttribute('data-count-attr')||'';
    const el = selector ? document.querySelector(selector) : null;
    initBinaryBackground(host, { el, attr: attr||undefined });
  });
}
```

**Опция (React‑обёртка):**

```tsx
// components/ux/BinaryBackground.tsx
export default function BinaryBackground({ countSelector, countAttr, clip, children }:{
  countSelector?: string; countAttr?: string; clip?: string; children: React.ReactNode;
}){
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    const host = ref.current!; if(!host) return;
    if(clip) host.setAttribute('data-binary-clip', clip);
    const el = countSelector ? document.querySelector(countSelector) : null;
    const dispose = initBinaryBackground(host, { el, attr: countAttr });
    return ()=> dispose && dispose();
  },[countSelector,countAttr,clip]);
  return <div ref={ref} data-binary-bg>{children}</div>;
}
```

---

## 6) Интеграция по маршрутам

### 6.1 AUDIT (`app/routes/dashboard/audit/index.tsx`)

**До:** `RouteWreath` рендерится напрямую в дереве.

**После:** обернуть в контейнер с фоном + скрытый счётчик.

```tsx
<RouteWreath
  label="AUDIT"
  value={totalAudits}
  title="Audit Dossiers"
  description={wreathDescription}
  ariaLabel={`AUDIT module total ${totalAudits}`}
/>
```

→

```tsx
<div data-binary-bg data-count-source="#audit-wreath-count" data-binary-clip="260px">
  <RouteWreath
    label="AUDIT"
    value={totalAudits}
    title="Audit Dossiers"
    description={wreathDescription}
    ariaLabel={`AUDIT module total ${totalAudits}`}
  />
  <span id="audit-wreath-count" className="sr-only">{totalAudits}</span>
</div>
```

### 6.2 CONTENT (`app/routes/dashboard/content/index.tsx`)

Аналогично, но селектор счётчика должен ссылаться на цифру контента. Если число рендерится внутри `CounterWreath`, добавить «прокси»:

```tsx
<div data-binary-bg data-count-source="#content-wreath-count" data-binary-clip="260px">
  <RouteWreath label="CONTENT" value={totalContent} title="Content Library" description={desc} />
  <span id="content-wreath-count" className="sr-only">{totalContent}</span>
</div>
```

При изменении фильтров/вкладок не забудьте обновлять `totalContent` (состояние) — фон перегенерируется автоматически через `MutationObserver`.

### 6.3 NEWS (`app/routes/dashboard/news/index.tsx`)

```tsx
<div data-binary-bg data-count-source="#news-wreath-count" data-binary-clip="260px">
  <RouteWreath label="NEWS" value={totalNews} title="News Dispatch" description={desc} />
  <span id="news-wreath-count" className="sr-only">{totalNews}</span>
</div>
```

---

## 7) Перфоманс и UX

**Бюджеты:**

* CPU надбавка < 2% на десктопе (60 fps базовый скролл).
* Память на панель: < 2 МБ.
* Не более 3 лент одновременно.
* Длительность анимации 95–130 s.

**Трюки:**

* `contain: layout paint` на слое.
* `will-change: transform` только на движущемся треке.
* Обновления текста батчем (замена `textContent` внутри уже существующих узлов).

---

## 8) Доступность

* `prefers-reduced-motion: reduce` — замедлить до ~статичного.
* Контраст и прозрачность: оптическая плотность в состоянии idle не должна мешать чтению (рекомендация: `opacity .085`).
* Все aria‑метки остаются на видимых контролах (`RouteWreath`/кнопки).

---

## 9) Фича‑флаг и конфигурация

**Вариант A (ENV):**

* Добавить `VITE_FEATURE_BINARY_BG=1`.
* В `main.tsx` запускать `autoInitBinaryBackground()` только если флаг включён.

**Вариант B (DOM):**

* В `<html data-features="binary-bg">` — инициализировать только при наличии фичи.

Рекомендуется реализовать оба варианта: ENV для сборки, DOM — для A/B‑включения на стендах.

---

## 10) Тест‑план (Playwright/Vitest)

1. **Рендер:** наличие `.ax-binary` у каждого `data-binary-bg`.
2. **Интерактив:** клики по селекту/кнопкам сверху не блокируются (фон с `pointer-events:none`).
3. **Reduced Motion:** при включении системной опции анимация почти статична.
4. **Регенерация:** изменение текста в `#*_wreath_count` ведёт к изменению контента `.ax-binary__chunk` (проверка по хешу строки).
5. **Перфоманс:** измерения `PerformanceObserver` вокруг анимации — нет всплесков layout.
6. **Вёрстка:** на брейк‑поинтах 1280/1536/1920 фон не залезает под круг (скриншоты сравниваются по порогу 0.02).
7. **Регрессия:** скриншоты базового экрана до/после — отличие только в слое.

---

## 11) Телеметрия (опционально)

* Снять один event `ui.binary_bg.init` по каждому хосту (label: route, clip, countValue).
* Периодическая регенерация не логируется (спам‑safe).

---

## 12) Откат

* Снять `data-binary-bg` у контейнеров **или** выключить фичу через ENV/DOM.
* Файлы оставить — без атрибутов слой не активен.

---

## 13) Acceptance Criteria

* Фон присутствует на трёх вкладках (AUDIT/CONTENT/NEWS), не мешает интерактиву, не рвёт перфоманс.
* При изменении количества элементов фон плавно меняется без «рывков» и скачков layout.
* Бинарный рисунок выглядит аксиометрично: красный/графитовый оттенок, мягкая виньетка, чёткая типографика.

---

## 14) Коммиты и PR

**Коммиты:**

* `feat(ui): add binary background layer for route wreath panels`
* `chore(ui): gate binary-bg via VITE_FEATURE_BINARY_BG`
* `test(e2e): add playwright checks for binary-bg layer`

**PR‑описание:**

* Что добавлено, где включено, как отключить.
* Скриншоты до/после (3 страницы).
* Перфоманс‑замер (до/после, среднее по 3 прогонам).

---

## 15) Чек‑лист агента

* [ ] Добавлены CSS/TS файлы слоя.
* [ ] Подключён импорт и инициализация в `main.tsx`.
* [ ] Обернуты `RouteWreath` на трёх вкладках в контейнеры `data-binary-bg`.
* [ ] Прокси‑счётчики добавлены и обновляются при фильтрации/переключении.
* [ ] Установлены `data-binary-clip` (по умолчанию `260px`, скорректировать при нужде).
* [ ] Прогнаны тесты, собран DEV build, проверен FPS/UX.
* [ ] Подготовлен PR с материалами.
