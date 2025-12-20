id: SEC-003
title: Санитайз Markdown разрешает неизвестные протоколы (javascript:, data:)
status: OPEN
severity: High
area: Reader / Content Preview
confidence: Medium

## Summary
PreviewPane рендерит Markdown через `marked` + DOMPurify c опцией `ALLOW_UNKNOWN_PROTOCOLS: true` и разрешёнными `style/svg` тегами. Это открывает путь для ссылок/картинок с `javascript:` или `data:` payload, которые DOMPurify в дефолте блокирует. Контент авторский, поэтому злоумышленник может внедрить JS-переход или data-URI с XSS в превью (plain/hybrid режимы).

## Steps to reproduce
1) Создать Markdown контент с `[pwn](javascript:alert('XSS'))` или `![x](data:text/html,<script>alert(1)</script>)`.  
2) Открыть запись в Content Hub → PreviewPane в plain/hybrid режиме.  
3) Клик по ссылке/картинке приводит к выполнению JS/data-пейлоада.

## Expected vs Actual
- Ожидаемо: неизвестные/опасные протоколы должны блочиться DOMPurify (default).  
- Фактически: `ALLOW_UNKNOWN_PROTOCOLS` пропускает их, XSS сохраняется.

## Evidence
- Санитайз-конфиг: `components/PreviewPane.tsx:22-34` (`ALLOW_UNKNOWN_PROTOCOLS: true`, разрешены `style`, `svg`, `path`, `defs`, градиенты).  
- Рендер Markdown с этим конфигом: `components/PreviewPane.tsx:247-285`.

## Root cause hypothesis
- Опция включена для поддержки кастомных схем/ресурсов, но не добавлены явные фильтры для `javascript:`/`data:`. Баланс безопасности не пересмотрен после открытия контента наружу.

## Proposed fix
- Убрать `ALLOW_UNKNOWN_PROTOCOLS` или явно запретить `javascript:`, `data:` в ссылках/ресурсах; ограничить список тегов, если нет острой потребности в inline-`style`/`svg`.  
- Добавить unit/e2e тест, проверяющий блокировку `javascript:` ссылок в превью.

## Acceptance criteria
- Ссылки/ресурсы с `javascript:`/`data:` не проходят в DOM, клик не вызывает выполнение.  
- Легальный контент остаётся отображаемым.  
- Автотест на XSS в Markdown проходит.

## References
- components/PreviewPane.tsx:22-34,247-285
