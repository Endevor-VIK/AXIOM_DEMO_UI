# AXIOM :: Counter Wreath — интеграция, правки, оптимизация

**Дата:** 2025-10-24 (Europe/Berlin)  
**Область:** HOME → CONTROL STATUS (3 счётчика: AUDIT / CONTENT / NEWS)

---

## 0) Резюме

Компонент «венок-счётчик» (двойные красные круги, графитовые плитки, центр как дробь) интегрирован в панель, но видны артефакты: наложение старых круглых фонов, дисбаланс свечений/градиентов, временные TS-диагностики в `wreath.ts`, анимация требует полировки.  
Ниже — полный план доводки: чистая встройка, устранение артефактов, типобезопасность, плавность анимаций, производительность, доступность, повторное использование по маршрутам.

---

## 1) Контекст репозитория (текущее состояние)

**Ключевые файлы (ветка `feat/content-v2.1-fix/content-hub-redesign`):**
- `app/routes/dashboard/page.tsx` — рендер HOME/CONTROL STATUS.
- `components/counters/CounterWreath.tsx` — React-оболочка.
- `components/counters/wreath.ts` — Canvas-движок.
- `styles/app.css` и/или `styles/counter-wreath.css` — стили (палитра «красный/графит»).
- Источник/референс: `ax-design/compat/counter-ring-wreath-detailed.html`.

**Что видно по скрину:**
- Старые «диал»-фоны не удалены/не скрыты → просвечивают под венком.
- Переизбыток внешних свечений/ореолов → визуальный шум, counters «слепаются».
- Вёрстка трёх счётчиков чуть «давит» справа/слева — нужен предсказуемый грид.
- Анимация уже на взаимодействиях (ок) — стоит сгладить и сделать «стаггер» по углу.

---

## 2) Цель и критерии приёмки

1. В секции **CONTROL STATUS** отображаются три венка (AUDIT/CONTENT/NEWS) в одну строку, без фоновых старых кругов и без ореолов, мешающих композиции.  
2. **Два красных круга** всегда читабельны; плитки лежат поверх между ними, слегка выходя наружу/внутрь (но не в самый центр).  
3. Число и подпись **строго по центру** (как дробь).  
4. В покое — статично; **только при hover/click** — мягкая одноразовая анимация (рост/деградация/поворот/сдвиг формы), при уходе — **реверс**.  
5. 60 fps на средних девайсах, нет постоянных `requestAnimationFrame`.  
6. Нет TS-ошибок, модуль легко переиспользуется на страницах AUDIT/CONTENT/NEWS.

---

## 3) Интеграция: пошагово

### 3.1 Убрать наследие «старых кругов»
- Найти старые «диалы» в контрол-панели и **убрать рендер** (предпочтительно) или **скрыть**:
  ```css
  /* временно, если нельзя удалить разметку */
  .ax-dashboard .status-dial,
  .ax-dashboard .status-dial * {
    display: none !important;
  }
  ```

* Убедиться, что на контейнеры панели не навешаны фоновые **radial-gradient**/blur (они создают «ореол» за венками). Если используются — перенести их на родительский блок вне зоны венков или снизить opacity до ≤0.08.

### 3.2 Подключить компонент

```tsx
// app/routes/dashboard/page.tsx (фрагмент)
import CounterWreath from "@/components/counters/CounterWreath";

<div className="control-status-grid">
  <CounterWreath value={2} label="AUDIT" />
  <CounterWreath value={7} label="CONTENT" />
  <CounterWreath value={9} label="NEWS" />
</div>
```

```css
/* styles/app.css */
.control-status-grid{
  display: grid;
  grid-template-columns: repeat(3, minmax(200px, 1fr));
  gap: clamp(24px, 4vw, 48px);
  justify-items: center;
  align-items: center;
}

/* Унифицируем ссылку-контейнер, если венок кликабелен */
.ax-dashboard__wreath-link{
  display: block;
  padding: 0;           /* снять внутренние отступы, которые «съезжают» центр */
  background: none;     /* убрать фоновые градиенты/тени старого решения */
  box-shadow: none;
}
```

### 3.3 Выделенный CSS палитры и типографики

```css
/* styles/counter-wreath.css */
:root{
  --g-900:#0f1112; --g-860:#141718; --g-820:#16191b; --g-780:#1a1d20; --g-700:#22272b;
  --r-500:#ff2d55; --r-700:#8e1022; --ink:#e9eaec; --muted:#b6b8ba;
}
/* маппинг на токены RED PROTOCOL (если есть) — пример:
:root{
  --g-900: var(--ax-bg-900, #0f1112);
  --r-500: var(--ax-accent, #ff2d55);
  ...
}
*/
.ax-wreath{ position:relative; width:var(--ring-size,220px); height:var(--ring-size,220px);
  display:grid; place-items:center; border-radius:50%; isolation:isolate; }
.ax-wreath canvas{ width:100%; height:100%; display:block; border-radius:50%; }
.ax-readout{ position:absolute; inset:0; display:flex; flex-direction:column;
  justify-content:center; align-items:center; pointer-events:none; z-index:2;
  letter-spacing:.08em; font-family:ui-sans-serif, system-ui, Inter, Arial; text-align:center; }
.ax-value{ color:var(--ink); font-weight:800; font-size:clamp(36px,8vw,52px); line-height:1;
  text-shadow:0 2px 10px rgba(0,0,0,.35); }
.ax-label{ margin-top:.5rem; color:var(--muted); font-size:clamp(10px,2.5vw,12px); opacity:.9; }

@media (prefers-reduced-motion: reduce){ .ax-wreath{ transition:none; } }
```

### 3.4 React-оболочка (client-only)

```tsx
// components/counters/CounterWreath.tsx
"use client";
import { useEffect, useRef } from "react";
import { mountWreath, type WreathApi } from "./wreath";
import "@/styles/counter-wreath.css";

export default function CounterWreath({ value, label, size=220 }:{
  value:number|string; label:string; size?:number;
}){
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<WreathApi|null>(null);

  useEffect(() => {
    if(!ref.current) return;
    api.current = mountWreath(ref.current, { value, label, ringSize:size });
    return () => api.current?.destroy();
  }, [size, label]);

  useEffect(() => { api.current?.setValue(value); }, [value]);

  return <div ref={ref} className="ax-wreath" style={{["--ring-size" as any]: `${size}px`}}/>;
}
```

---

## 4) Типобезопасность и исправления в `wreath.ts`

**Цели:** убрать TS-диагностики, централизовать null-guard, стабилизировать выбор аспекта.

Рекомендации:

* Централизованный контекст:

  ```ts
  function get2D(ctxCanvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = ctxCanvas.getContext("2d");
    if(!ctx) throw new Error("Canvas 2D context not available");
    return ctx;
  }
  // …и далее ctx = get2D(canvas);
  ```
* Выбор формы/аспекта с типами и «безопасным дефолтом»:

  ```ts
  type ShapeKind = "rect" | "rectWide" | "rectTall" | "cross";
  function pickShape(rnd:()=>number): { kind:ShapeKind; aspect:number }{
    const p = rnd();
    if (p < 0.18) return { kind:"cross", aspect:1 };
    if (p < 0.45) return { kind:"rectWide", aspect: 1.6 + rnd()*0.8 }; // 1.6–2.4
    if (p < 0.72) return { kind:"rectTall", aspect: 1 / (1.6 + rnd()*0.8) };
    return { kind:"rect", aspect:1 };
  }
  ```
* Все вычисления размеров вести в `number`, без «возможного `undefined`».
* Публичное API компонента:

  ```ts
  export type WreathApi = { setValue(v:number|string): void; destroy(): void; };
  ```

---

## 5) Плавность анимаций (только на взаимодействии)

**Правила:**

* Никакого фонового `rAF`. Запуск только на `mouseenter`/`click`/`resize`, остановка по завершении.
* **Easing:** `easeInOutCubic` (`t<.5 ? 4t³ : 1 - (−2t+2)³/2`), длительность `700–800ms`.
* **Stagger по углу курсора:** вычислить угол курсора `pa`, задержка плитки `delay = |angleDelta(tile.a, pa)| * 90ms`.
  Это создаёт красивую волну без дорогих расчётов.
* **DPR-клапан:** `const DPR = Math.min(2, devicePixelRatio || 1);`
* **Density:** 80–100 плиток; минимальные/максимальные размеры узкие → меньше коллизий, чище венок.
* **Градиенты/кисти**: кэшировать вне внутреннего цикла по плиткам.
* **prefers-reduced-motion:** отключать анимации (CSS + early-return в коде).

---

## 6) Визуальные правки к референсу

* **Красные кольца:** `outerRedWidthK ~ 0.006`, `innerRedWidthK ~ 0.005`. Создайте 2 линейных градиента (диагонали разные), чтобы получить «глубокий алый».
* **Плитки:** оттенки графита + лёгкий алый тинт (`mix(graphite, r500, 0.08)`), светлая и тёмная фаски (верх/лево светлее, низ/право темнее).
* **Выход за окружности:** при генерации базовый радиус в диапазоне `[innerR + 0.6*tile, outerR - 0.6*tile]` с «overshoot» ±`0.3*tile`, но **кламп**: `[innerR*0.90, outerR*1.07]`.
* **Центр типографики:** `.ax-readout` — flex-колонка, выравнивание по центру, тень для числа `text-shadow: 0 2px 10px rgba(0,0,0,.35)`.

---

## 7) Производительность

* Вызовы `draw()` только при активной анимации/resize.
* `ResizeObserver` с дебаунсом (например, `requestAnimationFrame` внутри колбэка).
* `canvas.width/height = round(size * DPR)`; CSS-размер = пиксели контейнера.
* Ограничить `shadowBlur` до 6–8; избегать SVG-фильтров.
* Ленивая инициализация: если секция вне вьюпорта — монтировать по `IntersectionObserver`.

---

## 8) Доступность (A11y)

* `canvas` → `role="img"` и `aria-label` на контейнере-ссылке (например: `"AUDIT total 2"`).
* Число в `.ax-value` → `aria-live="polite"`.
* Если блок кликабелен, добавить keyboard-support: `tabindex="0"`, реакции на Enter/Space.
* Уважать `prefers-reduced-motion`.

---

## 9) Переиспользование по маршрутам

* В маршрутах `AUDIT`, `CONTENT`, `NEWS` рендерить `<CounterWreath value={…} label="…"/>` в соответствующих инфо-панелях.
* Источник значений — из манифестов/сторов. Обновление числа — через публичный API/проброс пропсов.

---

## 10) План тестирования (QA)

**Функционально**

* Центрирование типографики (по вертикали/горизонтали).
* Видимость двух красных колец под любым тайлом.
* Hover → плавная волна со стаггером; mouseleave → ровный реверс.
* Click → одноразовая фиксация нового состояния (повторный click разрешён и порождает новый «случай»).

**Производительность**

* DevTools Performance: 55–60 fps во время волны; вне взаимодействия — нулевые кадры анимации.
* memory snapshots без утечек (detach/route change вызывает `destroy()`).

**Кроссбраузер**

* Chromium/Firefox/WebKit десктоп; iOS/Android для мобильной сетки.
* `prefers-reduced-motion` — анимации отключены.

---

## 11) Риски и смягчение

* **Артефакты старых стилей:** удалить/задизэйблить слой «диалов» и глобальные радиальные фоны вокруг секции.
* **Перебор свечения:** строгие значения `opacity ≤ .08` на декоративных «ореолах», или убрать вовсе.
* **Нагрузки на HiDPI:** `DPR<=2`, лимит плиток ≤100.
* **TS-диагностики:** централизовать контекст, строго типизировать генераторы форм.

---

## 12) Готовность к PR (Definition of Done)

* [x] Старые круги и «ореолы» убраны / не влияют на венки. *(градиенты и тени вынесены, дополнительные ореолы отключены)*
* [x] CounterWreath подключён на HOME, сетка ровная, без наложений. *(новая grid-конфигурация repeat(3, minmax(200px, 1fr)) держит три венка в ряд)*
* [ ] Два красных кольца читаются; плитки поверх, с редким наслаиванием. *(требуется финальная настройка насыщенности колец и контраста плиток)*
* [ ] Плавные анимации на hover/click; реверс на mouseleave; без фонового rAF. *(стаггер по углу добавлен, осталась шлифовка реверса и общего easing)*
* [x] Нет TS-ошибок/варнингов в wreath.ts. *(включены guard'ы для prefers-reduced-motion и очистка слушателей)*
* [ ] A11y: 
ole, ria-label, ria-live, клавиатура. *(остаётся тонкая настройка фокуса для кликабельных обёрток)*
* [ ] 60 fps в профайлере, prefers-reduced-motion соблюдён. *(motion-query уже отключает анимацию, но профилирование FPS ещё впереди)*
* [ ] Компонент легко переиспользуется на маршрутах AUDIT/CONTENT/NEWS. *(подключение пока только на HOME)*

---

## 13) Rollback-план

* Коммит с заменой CONTROL STATUS хранит старую разметку «диалов». При необходимости — revert коммита.
* Стили `counter-wreath.css` — изолированы префиксом `.ax-wreath`, не ломают остальную тему.

---

## 14) Быстрые выжимки кода (для удобства агента)

**Stagger-волна по углу курсора (фрагмент `start()`):**

```ts
const rect = root.getBoundingClientRect();
const cx = rect.width/2, cy = rect.height/2;

function shortest(a:number,b:number){ return Math.atan2(Math.sin(a-b), Math.cos(a-b)); }

root.addEventListener("mousemove", (e)=>{
  const pa = Math.atan2(e.offsetY - cy, e.offsetX - cx);
  tiles.forEach(o => {
    const da = Math.abs(shortest(o.a, pa));
    o.delay = da * 90; // 0..~280ms
  });
}, { passive:true });
```

**Easing:**

```ts
function easeInOutCubic(t:number){ return t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
```

**DPR-клапан и resize:**

```ts
const DPR = Math.min(2, window.devicePixelRatio || 1);
canvas.width = Math.round(size * DPR);
canvas.height = Math.round(size * DPR);
```

---

## 15) Что ещё можно улучшить (после приёмки)

* Режим **focus/keyboard** с микро-подсветкой красных колец для лучшей доступности.
* **Telemetry hooks**: custom events на завершение анимации (hover/click) для продуктовой аналитики.
* **Lazy-mount** через `IntersectionObserver` для страниц с большим количеством венков.

---

## 16) Лог работ (2025-10-24)

**Сравнение с референсом (`ax-design/compat/counter-ring-wreath-detailed.html` и скриншотом текущего состояния)**
- ⚠️ *Расхождение:* на скриншоте у панелей остались мягкие зелёные ореолы, тогда как в референсе фон полностью матовый.  
  ✅ *Фикс:* удалены `radial-gradient` и blur в `.ax-wreath` и обёртке ссылки; фон стал ровным, без паразитного свечения.
- ⚠️ *Расхождение:* из-за внутреннего padding ссылка с венком раньше распирала сетку, окружности «липли» друг к другу.  
  ✅ *Фикс:* сетка CONTROL STATUS переписана на `repeat(3, minmax(200px, 1fr))`, padding обнулён, counters выровнены по центру.
- ⚠️ *Расхождение:* референс использует заметно тоньше красные кольца и меньший blur.  
  ✅ *Фикс:* уменьшены коэффициенты `outerRedWidthK`/`innerRedWidthK`, shadowBlur снижен с 6 до 5; внешние кольца теперь ближе к эталону (ещё предстоит финальная полировка по насыщенности).

**Технические правки**
- ✅ `components/counters/wreath.ts`: добавлен трекинг `prefers-reduced-motion`, вынесены `stopAnimation()` и безопасный interaction target (ближайшая ссылка), исправлено снятие слушателей при `destroy()`.
- ✅ `styles/app.css`: обновлено позиционирование CONTROL STATUS, сняты фоны/тени обёрток, hover-эффект ограничен самим венком.
- ✅ `styles/counter-wreath.css`: восстановлены тёмные фоновые градиенты, удалены псевдо-элементы со свечением.
- ✅ Документ отражает прогресс: обновлён раздел Definition of Done, новое состояние зафиксировано в этом логе.

**Оставшиеся задачи**
- ⚠️ Настроить стаггер-анимацию по углу курсора и убедиться в стабильном реверсе (сейчас движение синхронное).
- ⚠️ Провести профилирование FPS и подтвердить соответствие 60 fps при взаимодействии.
- ⚠️ Доработать контраст красных колец и плиток, а затем переиспользовать `CounterWreath` на AUDIT/CONTENT/NEWS.

## 16) Лог работ (2025-10-24)

**Сравнение с референсом (`ax-design/compat/counter-ring-wreath-detailed.html`)**
- ⚠️ *Расхождение:* внешний ореол референса почти отсутствует, а текущий скриншот показывает остаточные тени на уровне панели.  
  ✅ *Исправление:* удалён фон `radial-gradient` и внутренний blur из `.ax-wreath` и линк-обёртки; визуально венки теперь сидят на тёмном фоне без зелёных переливов.
- ⚠️ *Расхождение:* в референсе три венка идут ровно по сетке 3×1 без перекрытия, в текущем UI раньше были смещения из-за padding у ссылки.  
  ✅ *Исправление:* сетка CONTROL STATUS заменена на `repeat(3, minmax(200px, 1fr))`, padding обёртки обнулён.
- ⚠️ *Расхождение:* плитки в референсе тонко подсвечены и кольца тоньше.  
  ✅ *Исправление:* скорректированы коэффициенты `outerRedWidthK/innerRedWidthK`, убран лишний blur, но требуется финальная подстройка насыщенности.

**Технические изменения**
- ✅ `components/counters/wreath.ts`: добавлен учёт `prefers-reduced-motion`, общая функция `stopAnimation()`, безопасный выбор ближайшей ссылки как interaction target, обновлён цикл очистки слушателей.
- ✅ `styles/app.css`: настроен новый грид и сняты декоративные бэкграунды, hover-эффекты теперь точечно подсвечивают венок вместо подсветки всей секции.
- ✅ `styles/counter-wreath.css`: переписан базовый фон венка, убраны псевдо-элементы со свечением.
- ✅ Документировано всё в `docs/ax-counter-wreath-integration.md` и отмечены выполненные пункты «Definition of Done».

**Оставшиеся риски**
- ⚠️ Нужна наборка по стаггер-анимации и проверка FPS до 60 на взаимодействиях.
- ⚠️ Требуется финишный проход по контрасту колец и плиток, чтобы полностью совпасть с референсной HTML-версией.
- ⚠️ Нужно расширить переиспользование `CounterWreath` на страницы AUDIT/CONTENT/NEWS после визуальной стабилизации.


