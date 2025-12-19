id: SEC-002
title: Reader встраивает HTML без санитайза (stored XSS)
status: OPEN
severity: High
area: Reader
confidence: High

## Summary
ReaderPage загружает `/content-html/{id}.html` и сразу вставляет в DOM через `dangerouslySetInnerHTML` без DOMPurify/iframe. Любой скрипт из файла выполняется в основном контексте приложения с доступом к хранилищу — это прямой stored-XSS канал для авторского контента.

## Steps to reproduce
1) Создать `public/content-html/TEST.html` с `<script>alert('XSS');localStorage.setItem('pwn','1');</script>`.  
2) Открыть `/content/TEST`.  
3) Скрипт выполняется, меняет хранилище, отображает alert.

## Expected vs Actual
- Ожидаемо: HTML должен быть очищен или отрендерен в sandbox iframe без прав origin.  
- Фактически: сырой HTML вставляется в документ и исполняет произвольный JS.

## Evidence
- Загрузка и вставка: `src/features/content/pages/ReaderPage.tsx:94-119` (fetch) и `src/features/content/pages/ReaderPage.tsx:265-283` (`dangerouslySetInnerHTML`).

## Root cause hypothesis
- Легаси-ридер проектировался под “доверенные” HTML-заглушки и пропустил санитайз; после перехода к авторскому контенту канал остался.

## Proposed fix
- Санитизировать HTML через DOMPurify (строгий профиль) или рендерить в iframe без `allow-same-origin`.  
- Лучше унифицировать Reader с PreviewPane, где уже есть контролируемые режимы и санитайз Markdown.  
- Добавить security-тест на вставку вредоносного HTML.

## Acceptance criteria
- Скрипты из файлов не исполняются в основном документе; попытка XSS не меняет `localStorage`.  
- Валидный HTML отображается корректно.  
- Автотест с вредоносным payload проходит (XSS блокируется).

## References
- src/features/content/pages/ReaderPage.tsx:94-119,265-283
