<!-- docs/iterations/ui-scale-normalization-v2.3.1/spec.md -->

# AXIOM UI — Нормализация масштаба без html-zoom (v0.2)

## 0) Референсы
- BUG-006: docs/bugs/BUG-006_scale-parity-windowed.md
- Связанный баг: docs/bugs/BUG-002_windowed-scale-break.md
- Текущая итерация: docs/agent_ops/logs/0005_bugfix-v2.3.1-bugs-sweep.md

## 1) Цель
Стабилизировать визуальный масштаб и форм-фактор UI во всех режимах (fullscreen + windowed), убрав глобальный `html zoom/transform` и переведя управление масштабом на токены и контролируемую математику.

### 1.1 Итоговый эффект
- В windowed режиме элементы становятся меньше, но не "плывут" и не ломают форму.
- Масштаб управляется единой системой, без двойного масштабирования (токены + html zoom).
- Брейкпоинты и раскладки переключаются предсказуемо и без артефактов.

### 1.2 Базовый формат
- Базовая дизайн-рамка: **1920x1080**.
- UI проектируется под 1920/1080 и затем аккуратно масштабируется вниз.

### 1.3 Почему нужен отдельный масштаб (0.8)
- Исторически дизайн был плотнее и в 100% выглядел "крупным".
- Масштаб 0.8 делал визуал таким, как задумывалось.
- Важно сохранить этот визуальный результат, но без глобального html zoom.

### 1.4 Что не делаем
- Не переписываем весь UI сразу.
- Не меняем функциональность фич и контента.
- Не трогаем локальные zoom-режимы (preview/iframe) без явной необходимости.

## 2) Текущее состояние (анализ)
1) Глобальный масштаб сейчас задан через `html { zoom: 0.8 }` и fallback `transform: scale(0.8)`.
2) Есть две системы токенов:
   - ax-design/tokens.css (используется в app/main.tsx)
   - styles/tokens.css (похоже, legacy; в app/main.tsx не импортируется)
3) Масштаб дублируется:
   - токены уже используют `--ax-scale`
   - поверх них идёт `html zoom/transform`, что приводит к дрейфу и непредсказуемой геометрии
4) Локальный scale/zoom присутствует в отдельных модулях:
   - preview/iframe масштабы (styles/app.css)
   - doc wrapper zoom (app/styles/red-protocol-overrides.css)

### 2.1 Инвентаризация масштабов (по файлам)
| Слой | Файл/узел | Механизм | Примечания |
| --- | --- | --- | --- |
| Глобальный масштаб | `styles/app.css` (`html`, `:root`) | `--ax-ui-scale: 0.8`, `html { zoom }`, fallback `transform: scale` + `width/height` | Масштабирует весь UI; создаёт новый containing block и усиливает дрейф при windowed. |
| Токены плотности | `ax-design/tokens.css` (импорт в `app/main.tsx`) | `--ax-scale: .81`, размеры/шрифты/spacing через `calc(* var(--ax-scale))` | Реальная плотность уже уменьшена; вместе с html zoom даёт двойное масштабирование. |
| Legacy токены | `styles/tokens.css` | `--ax-scale: 0.9` + дубли токенов | Не импортируется в `app/main.tsx`; риск «двух правд», нужен аудит использования. |
| Preview zoom (контент/аудит) | `components/PreviewPane.tsx`, `styles/app.css`, `ax-design/components.css` | `data-zoom` (`zoom: 1.25/1.5`), `--ax-preview-zoom` + `transform: scale` для iframe | Локальное масштабирование preview; важно изолировать от глобального масштаба. |
| Module iframe zoom | `styles/app.css` (`.ax-module__iframe`) | `transform: scale(var(--ax-preview-zoom))` | Локальная логика превью, не влияет на layout shell. |
| Doc wrapper zoom | `app/styles/red-protocol-overrides.css` (`.ax-doc-wrapper`) | `transform: scale()` по `data-scale` | Используется в viewer (Audit/Roadmap/Reader); влияет на sticky/portal при глобальном scale. |
| Анимационные масштабы | `styles/login-cyber.css`, `styles/login-bg.css` | `transform: translate/scale` в анимациях | Визуальные эффекты, не участвуют в общей геометрии. |
| Контентные HTML | `public/data/content/*`, `public/content-html/*` | `transform: scale` внутри контента (анимации) | Вне scope нормализации UI, трогать не нужно. |

### 2.2 Карта layout/порталов (что масштабируется)
DOM/корень:
- `index.html`: `#root`, `#modal-root` (порталы), `#fx-layer` (эффекты).

Layout shell (основные контейнеры):
- `app/routes/_layout.tsx`: `.ax-page`, `.ax-header.ax-topbar`, `HeadlinesTicker`, `.ax-shell.ax-content` + `.ax-container`, `.ax-footer.ax-status`.
- `ax-design/components.css`: `.ax-container` базируется на `--gutter` и `--container-max` (зависит от `--ax-scale`).
- `styles/app.css`: `.ax-shell` управляет ширинами/отступами и влияет на grid-композицию.

Порталы/оверлеи (должны следовать canvas масштабу):
- `components/UserMenuDropdown.tsx` → `#modal-root` / `document.body`.
- `components/Modal.tsx` → `#modal-root` / `document.body`.
- `src/features/content/components/ReaderMenuLayer.tsx` → `#modal-root`.

Вывод:
- При переходе на canvas `#modal-root` должен жить внутри `ax-canvas`, иначе порталы будут иметь другой масштаб/позиционирование.

### 2.3 Точки внедрения Phase 1 (что будем менять)
- `app/main.tsx`: инициализация Scale Manager (подписка на resize, выставление CSS‑переменных).
- `app/routes/_layout.tsx`: обёртка UI в `ax-viewport` + `ax-canvas` (новый слой масштабирования).
- `index.html`: решение по `#modal-root` (переместить внутрь canvas через React-слой или runtime‑перенос).
- `components/Modal.tsx`, `components/UserMenuDropdown.tsx`, `src/features/content/components/ReaderMenuLayer.tsx`: привязка к `#modal-root` внутри canvas, fallback только для legacy.
- `styles/app.css`: убрать `html zoom/transform`, добавить стили `ax-viewport/ax-canvas` и режимы `data-scale-mode`.

## 3) Архитектура (перспективный путь)
### 3.1 Термины масштаба
- **Density scale**: визуальная плотность UI.
- **Viewport scale**: масштаб под конкретное окно (windowed vs fullscreen).
- **Composed scale**: итоговый масштаб для токенов (density * viewport).
- **Virtual width/height**: ширина/высота дизайн-канвы после применения viewport scale.

### 3.2 Scale Manager 2.0 (JS)
Единая математика, без html zoom.

- Базовая рамка: `baseWidth = 1920`, `baseHeight = 1080`.
- Алгоритм:
  - `viewportScale = clamp(0.75, min(window.innerWidth / baseWidth, window.innerHeight / baseHeight), 1.0)`
  - `densityScale = 0.8` (настройка, фиксирует визуальную задумку)
  - `composedScale = densityScale * viewportScale`
- Применение:
  - `--ax-density-scale` = densityScale
  - `--ax-viewport-scale` = viewportScale
  - `--ax-scale` = composedScale (используется токенами)
  - `--ax-virtual-w` = window.innerWidth / viewportScale
  - `--ax-virtual-h` = window.innerHeight / viewportScale
  - `data-layout` вычисляется по virtual width, а не по реальной ширине окна

### 3.3 Canvas layout (без html zoom)
Новый слой масштабирования — **canvas-контейнер**, а не html.

Предлагаемая структура:
```
<body>
  <div id="root">
    <div class="ax-viewport" data-scale-mode="managed">
      <div class="ax-canvas" id="ax-canvas">
        ... app UI ...
      </div>
    </div>
  </div>
  <div id="modal-root"></div>
</body>
```

Правила:
- `ax-viewport` центрирует canvas и может создавать letterbox при несоответствии пропорций.
- `ax-canvas` масштабируется через `transform: scale(var(--ax-viewport-scale))`.
- Токены масштабируются через `--ax-scale`.

### 3.4 Portal стратегия (чтобы overlay не ломался)
- `#modal-root` нужно разместить внутри `ax-canvas`, если оверлей должен масштабироваться вместе с UI.
- Для системных элементов без масштаба можно добавить отдельный `#system-root`.
- Все overlay/menus относятся к UI-слою и должны масштабироваться синхронно с canvas.

### 3.5 Breakpoints без дрейфа
- `data-layout="xl|lg|md|sm"` рассчитывается по **virtual width**.
- Media queries остаются только для крайних мобильных режимов.
- Это позволяет сохранить desktop-сетки при windowed режиме.

### 3.6 Токены и источники правды
- Единственный источник токенов: ax-design/tokens.css.
- styles/tokens.css пометить как legacy; проверить использование и либо удалить, либо синхронизировать.
- Ключевые размеры переводим на токены (`--space-*`, `--fs-*`, `--r-*`, `--btn-h`, `--chip-h`).

### 3.7 Диагностика (для устойчивости)
- Ввести debug-оверлей масштаба (опционально):
  - scale values
  - virtual width/height
  - data-layout

## 4) Зоны воздействия (приоритет)
P0 (обязательные):
- Topbar + ticker + status line (layout shell)
- Dashboard home (контрольные панели, cards)
- Content hub (фильтры, плитки, карточки)

P1:
- News page
- Audit/Roadmap (preview контейнеры)
- Reader page (слои, overlay)

P2:
- Profile/Settings/Favorites/Help

## 5) Roadmap
### Фаза 0 — Подготовка (1-2 дня)
- Инвентаризация масштабов (html zoom, локальные scale, токены).
- Контрольные размеры и baseline скриншоты (1920/1600/1440/1280 + windowed 80-90%).
- Подготовка «эталонных» скринов (владельцы дают набор).

### Фаза 1 — Инфраструктура масштаба (2-3 дня)
- Реализация Scale Manager.
- Введение `ax-viewport` и `ax-canvas`.
- Введение `data-layout`.
- Флаг `data-scale-mode=legacy` для быстрого отката.

### Фаза 2 — Миграция core-layout (2-5 дней)
- Перевести layout shell на токены и data-layout.
- Обновить главные сетки (home/content).
- Удалить html zoom/transform.

### Фаза 3 — Миграция остальных экранов (3-6 дней)
- News/Audit/Roadmap/Reader.
- Устранение локальных артефактов (sticky, overlay).

### Фаза 4 — QA и стабилизация (2-3 дня)
- Регресс-скрины до/после.
- Smoke-check ключевых маршрутов.
- Микрофиксы по визуальным багам.

## 6) Чеклист внедрения
### Preflight
- [ ] Подтвердить, что styles/tokens.css не используется.
- [ ] Подготовить baseline-скриншоты (1920/1080 как эталон).
- [ ] Сложить скриншоты в `docs/iterations/ui-scale-normalization-v2.3.1/assets/screenshots/`.
- [ ] Зафиксировать target-окна: 1920, 1600, 1440, 1280 + windowed 80-90%.

### Implementation
- [ ] Добавить Scale Manager.
- [ ] Ввести `ax-viewport`/`ax-canvas`.
- [ ] Ввести data-layout и перенести 1-2 ключевые медиа-ветки.
- [ ] Перевести ключевые размеры на токены.
- [ ] Удалить html zoom/transform.

### QA
- [ ] Сетка в windowed сохраняет форму и позиции.
- [ ] Header/ticker/status не смещаются и остаются читабельны.
- [ ] Overlay/portal не смещаются при разных DPI.
- [ ] Нет “прыжков” при ресайзе окна.

### Rollback
- [ ] Флаг `data-scale-mode=legacy` доступен для быстрого отката.

## 7) Риски и меры
- Риск: много px-значений вне токенов -> регрессы.
  - Мера: мигрировать по слоям, фиксировать скриншоты.
- Риск: portal/sticky слои ведут себя иначе без html zoom.
  - Мера: привязать portal к canvas, протестировать Reader/Dropdown.
- Риск: непредсказуемые DPI/zoom в браузере.
  - Мера: учитывать devicePixelRatio при расчете scale (опционально).

## 8) Выходные артефакты
- Scale Manager 2.0.
- Новый canvas-контейнер и data-layout.
- Обновленные токены и core layout.
- Обновленные документы BUG-006/BUG-002.
- Лог в 0005 с прогрессом и коммитами.
