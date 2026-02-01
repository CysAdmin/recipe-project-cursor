# Cookmarker

Recipe collection app — save and manage recipes from your favorite sites (per PRD v1.0).

## Features (MVP)

- **Auth**: Register, login, JWT sessions
- **Recipes**: Import from URL (Schema.org + Cheerio), personal collection, favorites, notes
- **Discover**: Search all recipes, save to collection
- **Meal plan**: Weekly calendar (breakfast, lunch, dinner, snacks), drag-and-drop from your recipes
- **Shopping list**: Generate from scheduled recipes for a date range, print

## Tech stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3), JWT, bcrypt, Cheerio
- **Frontend**: Vite, React, React Router, Tailwind CSS, TanStack Query, @dnd-kit (drag and drop)

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup and run (local)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env
npm run init-db
npm run dev
```

API runs at **http://localhost:3001**.  
Create `.env` and set `JWT_SECRET` and optionally `PORT`, `DATABASE_PATH`.

### 2. Frontend

```bash
cd client
npm install
npm run dev
```

App runs at **http://localhost:5173**.  
Vite proxies `/api` to the backend, so use the app at 5173.

### 3. First use

1. Open http://localhost:5173
2. Sign up (email + password, min 8 chars, letters and numbers)
3. In **My Recipes**, paste a recipe URL (e.g. from AllRecipes, Food Network, Bon Appétit) and click Import
4. In **Meal Plan**, drag recipes into the week grid
5. In **Shopping List**, pick the date range and generate/print the list

## Project layout

```
recipe-project-cursor/
├── client/                 # Vite + React frontend
│   ├── src/
│   │   ├── api/            # API client
│   │   ├── components/
│   │   ├── context/        # Auth
│   │   └── pages/
│   └── package.json
├── server/                 # Express API
│   ├── src/
│   │   ├── db/             # SQLite init and connection
│   │   ├── middleware/     # JWT auth
│   │   ├── routes/         # auth, recipes, meal-schedules, shopping-lists
│   │   └── services/      # recipe URL parser (Schema.org + Cheerio)
│   ├── data/               # recipes.db (created by init-db)
│   └── package.json
└── README.md
```

## API (summary)

- `POST /api/auth/register` — register
- `POST /api/auth/login` — login
- `GET /api/auth/me` — current user (Bearer token)
- `GET /api/recipes?mine=1` — my recipes
- `GET /api/recipes?q=...` — search
- `GET /api/recipes/:id` — recipe detail
- `POST /api/recipes/import` — import from URL (body: `{ "url": "..." }`)
- `POST /api/recipes/:id/save` — save to collection
- `DELETE /api/recipes/:id/save` — remove from collection
- `GET /api/meal-schedules?start=&end=` — schedules in range
- `POST /api/meal-schedules` — add (body: recipe_id, meal_date, meal_type, servings)
- `DELETE /api/meal-schedules/:id` — remove
- `GET /api/shopping-lists/generate?start=&end=` — generate list

## Notes

- Recipe import works best on sites that use **Schema.org Recipe** JSON-LD; fallback selectors are used when needed.
- For production you’d switch to PostgreSQL/MySQL, add email verification, and deploy with HTTPS.
