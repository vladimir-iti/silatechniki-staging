# Тестовая копия силатехники.рф

Полная копия сайта на GitHub Pages — для просмотра заказчиком до выкладки
на боевой домен. Это не боевой сайт:

- все страницы закрыты от поисковиков: `meta robots noindex, nofollow`,
  `robots.txt` с `Disallow: /`, карта сайта не выкладывается;
- заявка с формы не отправляется (на Pages нет обработчика) — вместо
  отправки посетитель видит сообщение «это тестовая копия»;
- сверху каждой страницы — плашка «Тестовая копия».

`canonical` и разметка schema.org оставлены с боевым адресом.

## Структура

- `scripts/build_staging.mjs` — берёт готовую сборку сайта (`../dist/`),
  переписывает корневые адреса под подпапку `/silatechniki-staging/`,
  закрывает индексацию, отключает заявку.
- `scripts/check_staging.py` — проверка: noindex на каждой странице,
  robots.txt, битые и не переписанные адреса, заглушка формы, `.nojekyll`.
- `docs/` — собранная копия (GitHub Pages читает эту папку).

## Пересборка

```bash
npm run build                              # из корня проекта silatechniki
node staging/scripts/build_staging.mjs
python3 staging/scripts/check_staging.py
```

## Локальный просмотр

GitHub Pages отдаёт `/burenie` как `burenie.html`; `python3 -m http.server`
так не умеет, поэтому локально открывайте страницы с `.html`:

```bash
mkdir -p staging/.serve && ln -sfn ../docs staging/.serve/silatechniki-staging
python3 -m http.server 8124 -d staging/.serve   # http://localhost:8124/silatechniki-staging/
```
