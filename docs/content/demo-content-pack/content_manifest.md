<!-- docs/content/demo-content-pack/content_manifest.md -->

# Манифест контента — DEMO CONTENT PACK

## ignore_patterns (шаблоны игнора)
- `FRAMEWORK`, `.f_`, `.f_FRAMEWORK/`
- `README`, `.r_README.md`
- `.n_NAV.json`
- `.s_STRUCTURE.md`
- `.z_META_CORE/`
- `todo.md`, `custom.html`
- `*.html` (экспорт/снимки, если есть md-источник)

## Записи

| source_path | category | title | slug_or_route | target_path_in_site | assets_used | status | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| temp/02.04_ECHELON/02.04.01_ECHELON.md | Locations | Echelon — вертикальная мегаструктура | LOC-ECHELON-CORE | content-src/LOC-ECHELON-CORE.md; public/data/content/locations/LOC-ECHELON-CORE/index.md; public/content-html/LOC-ECHELON-CORE.html | /assets/content/echelon-core.png | created | Источник разделён на витринный формат. |
| temp/02.04_ECHELON/02.04.01_ECHELON.md | Locations | Undercity — глубинный инфрастратум | LOC-ECHELON-UNDERCITY | content-src/LOC-ECHELON-UNDERCITY.md; public/data/content/locations/LOC-ECHELON-UNDERCITY/index.md; public/content-html/LOC-ECHELON-UNDERCITY.html | /assets/content/placeholder.png | created | Витрина по блоку UNDERCITY; превью заменено на placeholder. |
| temp/03_CHARACTERS/03.02_LIZA.md | Characters | Лиза Синклер — призрачный хакер | 03.02_LIZA | content-src/03.02_LIZA.md; public/data/content/characters/CHR-LIZA-0302/index.md; public/content-html/03.02_LIZA.html | /assets/content/liza.png | created | PLACEHOLDER-поля исключены. |
| temp/03_CHARACTERS/03.17_WHITE_CONTOUR.md | Characters | White Contour — призрачный агент | 03.17_WHITE_CONTOUR | content-src/03.17_WHITE_CONTOUR.md; public/data/content/characters/CHR-WHITE-CONTOUR-0317/index.md; public/content-html/03.17_WHITE_CONTOUR.html | /assets/content/white-contour.png | created | Уплотнённый профиль без служебных блоков. |
| temp/03_CHARACTERS/03.18_NOFACE.md | Characters | NoFace — теневой куратор | 03.18_NOFACE | content-src/03.18_NOFACE.md; public/data/content/characters/CHR-NOFACE-0318/index.md; public/content-html/03.18_NOFACE.html | /assets/content/placeholder.png | created | Акцент на брокер данных и теневые каналы; превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.01_ACCELERATOR.md | Technologies | Accelerator — нейро-ускоряющее ядро | TEC-ACCELERATOR-0501 | content-src/TEC-ACCELERATOR-0501.md; public/data/content/technologies/TEC-ACCELERATOR-0501/index.md; public/content-html/TEC-ACCELERATOR-0501.html | /assets/content/accelerator-core.png | created | Витрина по ключевым режимам/модулям. |
| temp/05_TECHNOLOGIES/05.02_NIGHTMARE.md | Technologies | Nightmare — трансцендентный клинок | TEC-NIGHTMARE-0502 | content-src/TEC-NIGHTMARE-0502.md; public/data/content/technologies/TEC-NIGHTMARE-0502/index.md; public/content-html/TEC-NIGHTMARE-0502.html | /assets/content/nightmare-benchmark.png | created | Витрина по резонансу и выбору носителя. |
| temp/06_FACTIONS/06.10_CHROME_SYNDICATE.md | Factions | Chrome Syndicate — кибер-наркокартель | FAC-CHROME-SYNDICATE-0610 | content-src/FAC-CHROME-SYNDICATE-0610.md; public/data/content/factions/FAC-CHROME-SYNDICATE-0610/index.md; public/content-html/FAC-CHROME-SYNDICATE-0610.html | /assets/content/placeholder.png | created | Фокус на структуре и подпольном рынке; превью заменено на placeholder. |
| temp/03_CHARACTERS/03.04_TOMMY.md | Characters | Томми «Гром» Громвелл — уличный полководец | 03.04_TOMMY | content-src/03.04_TOMMY.md; public/data/content/characters/CHR-TOMMY-0304/index.md; public/content-html/03.04_TOMMY.html | /assets/content/tommy.png | created | Уплотнённый профиль без служебных блоков. |
| temp/03_CHARACTERS/03.999.dream_EVA.md | Characters | EVA — сущность сна | 03.99_EVA | content-src/03.99_EVA.md; public/data/content/characters/CHR-EVA-0399/index.md; public/content-html/03.99_EVA.html | /assets/content/noface.png | created | Санитизация DRAFT/PLACEHOLDER блоков; превью заменено на noface.png. |
| temp/05_TECHNOLOGIES/05.03_SPECTRE_GT.md | Technologies | SPECTRE GT — резонансный фазовый носитель | TEC-SPECTRE-GT-0503 | content-src/TEC-SPECTRE-GT-0503.md; public/data/content/technologies/TEC-SPECTRE-GT-0503/index.md; public/content-html/TEC-SPECTRE-GT-0503.html | /assets/content/spectre-gt.png | created | Витрина по фазовому движку и нейро-интерфейсу. |
| temp/05_TECHNOLOGIES/05.04_HARPOON_IMPLANT.md | Technologies | Harpoon Implant — якорный боевой трос | TEC-HARPOON-0504 | content-src/TEC-HARPOON-0504.md; public/data/content/technologies/TEC-HARPOON-0504/index.md; public/content-html/TEC-HARPOON-0504.html | /assets/content/placeholder.png | created | Санитизированный профиль Project Striker; превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.05_MAGNETIC_IMPLANT.md | Technologies | Magnetic Implant — модуль грави-сцепления | TEC-MAGNETIC-0505 | content-src/TEC-MAGNETIC-0505.md; public/data/content/technologies/TEC-MAGNETIC-0505/index.md; public/content-html/TEC-MAGNETIC-0505.html | /assets/content/placeholder.png | created | Основа Grav-Walker без legacy-блоков; превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.06_NEURAL_SCANNER.md | Technologies | Neural Scanner — тактический нейросканер | TEC-NEURAL-SCANNER-0506 | content-src/TEC-NEURAL-SCANNER-0506.md; public/data/content/technologies/TEC-NEURAL-SCANNER-0506/index.md; public/content-html/TEC-NEURAL-SCANNER-0506.html | /assets/content/placeholder.png | created | Выжимка Sentinel-протокола; превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.07_BLOODTECH.md | Technologies | Bloodtech — симбиотический био-тех | TEC-BLOODTECH-0507 | content-src/TEC-BLOODTECH-0507.md; public/data/content/technologies/TEC-BLOODTECH-0507/index.md; public/content-html/TEC-BLOODTECH-0507.html | /assets/content/placeholder.png | created | Превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.08_GROM_FIST.md | Technologies | Grom Fist — ударный имплант улиц | TEC-GROM-FIST-0508 | content-src/TEC-GROM-FIST-0508.md; public/data/content/technologies/TEC-GROM-FIST-0508/index.md; public/content-html/TEC-GROM-FIST-0508.html | /assets/content/placeholder.png | created | Уличный имплант Thunder Dogs; превью заменено на placeholder. |
| temp/05_TECHNOLOGIES/05.09_T_COLLAR.md | Technologies | T-Collar — защитный шейный модуль | TEC-T-COLLAR-0509 | content-src/TEC-T-COLLAR-0509.md; public/data/content/technologies/TEC-T-COLLAR-0509/index.md; public/content-html/TEC-T-COLLAR-0509.html | /assets/content/placeholder.png | created | Модуль ближнего боя; превью заменено на placeholder. |
| temp/06_FACTIONS/06.09_REAPERS.md | Factions | Reapers — изгнанники лимбо | FAC-REAPERS-0609 | content-src/FAC-REAPERS-0609.md; public/data/content/factions/FAC-REAPERS-0609/index.md; public/content-html/FAC-REAPERS-0609.html | /assets/content/placeholder.png | created | Превью заменено на placeholder. |
| temp/03_CHARACTERS/03.01_VIKTOR.md | Characters | Виктор (VIKTOR) | CHR-VIKTOR-0301 | already in system | /assets/content/03.00_VIKTOR.png | skipped_existing | Уже присутствует в content-src и public/data/content. |
| temp/03_CHARACTERS/03.03_AXIOM.md | Characters | AXIOM — центральная ИИ-сущность | CHR-AXIOM-0303 | already in system | /assets/content/03.03_AXIOM.png | skipped_existing | Уже присутствует в content-src и public/data/content. |

## Игнорируемые примеры (pattern match)
- temp/02.04_ECHELON/**.r_README.md → ignored_system
- temp/02.04_ECHELON/**.n_NAV.json → ignored_system
- temp/03_CHARACTERS/03.00.s_STRUCTURE.md → ignored_system
- temp/03_CHARACTERS/03.00.f_FRAMEWORK/** → ignored_system
- temp/05_TECHNOLOGIES/todo.md → ignored_system
- temp/05_TECHNOLOGIES/custom.html → ignored_system
