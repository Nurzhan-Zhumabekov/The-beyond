# Frontend

Prototype frontend for Beyond AI Content Factory.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Current mock flow

- `/login` — sign in screen
- `/register` — registration screen
- `/projects` — project list
- `/` — generator: text/URL, output type, basic brandbook
- `/result` — generated copy + background/poster/banner review
- `/editor` — visual editor prototype
- `/history` — saved generation history
- `/brandbook` — reusable brand settings

The frontend currently uses mock content and does not publish anything automatically. Backend/API integration will replace the mock generation flow later.
