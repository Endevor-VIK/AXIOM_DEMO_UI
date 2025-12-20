AXIOM_DEMO_UI: Запуск и деплой

Этот файл дополняет README и описывает практические шаги для локального запуска, сборки и публикации на GitHub Pages.

Требования
- Node.js 20+ (желательно LTS 20)
- npm 9+

Быстрый старт (локально)
- Установка зависимостей: `npm ci`
- Запуск dev-сервера: `npm run dev`
  - адрес: `http://localhost:5173/`
  - Vite в dev режиме сам делает SPA fallback

Сборка (dist)
- Команда: `npm run build`
- Результат: каталог `dist/`

Экспорт для GitHub Pages
- Команда: `npm run export`
- Результат:
  - `export/site/` — готовый статический сайт
  - `export/data/` — отредактированные данные (см. `tools/whitelist.json`)
  - `export/site/404.html` — SPA fallback для прямых ссылок
  - `export/site/.nojekyll` — отключение Jekyll

Превью экспортированного сайта
- Команда: `npm run preview:export`
- Адрес: `http://localhost:5174/`

База (base) для поддиректории Pages
- На GitHub Pages проект размещается под `https://<owner>.github.io/<repo>/`
- Корректный префикс задается переменной окружения `VITE_BASE`
  - В CI установлено в `"/<repo>/"`
  - Локальная проверка: PowerShell `$env:VITE_BASE="/AXIOM_DEMO_UI/"; npm run build`
  - Локальная проверка: bash `VITE_BASE="/AXIOM_DEMO_UI/" npm run build`
- Роутер использует `import.meta.env.BASE_URL`, ссылки будут корректны

Публикация на GitHub Pages (CI)
- Workflow: `.github/workflows/export-web-core.yml`
- Делает билд с `VITE_BASE`, формирует `export/site`, деплоит артефакт через `actions/deploy-pages`
- Шаги:
  1) Включить Pages: Settings → Pages → Source: GitHub Actions
  2) Push в ветку `main`

Проверки после деплоя
- Открывается главная: `https://<owner>.github.io/AXIOM_DEMO_UI/`
- Прямые ссылки не 404: `https://<owner>.github.io/AXIOM_DEMO_UI/dashboard`
- Ассеты грузятся с префиксом `/AXIOM_DEMO_UI/`

Отладка
- Если ассеты 404 на Pages: проверьте `VITE_BASE` и наличие `404.html` в артефакте
- Эмуляция base локально: `VITE_BASE="/AXIOM_DEMO_UI/" npm run dev`
