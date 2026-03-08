# Turmap Vite

Готовый проект под Vite + React + Tailwind для локального запуска и публикации на GitHub Pages.

## Быстрый старт

```bash
npm install
npm run dev
```

Приложение откроется обычно на `http://localhost:5173/`.

## Сборка

```bash
npm run build
npm run preview
```

## Публикация на GitHub Pages

В `vite.config.js` сейчас стоит:

```js
base: '/turmap/'
```

Это подходит для репозитория `turmap`.
Если имя репозитория другое, поменяй `base`.

Далее:

```bash
npm install
npm run deploy
```

## Что внутри

- `src/App.jsx` — основная логика приложения
- `src/components/ui/*` — минимальные UI-компоненты, чтобы проект работал без shadcn/ui
- состояние хранится в `localStorage`

## Важно

Это адаптированная версия рабочего preview-кода. Она запускается как обычный Vite-проект без зависимости от canvas-окружения.
