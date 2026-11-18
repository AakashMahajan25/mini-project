# Frruit

Monorepo for the Frruit app.

- `frruit-be/` — Express API (`server.js`, port 4000). Run with `npm install && npm run dev`. Needs a `.env` with `PORT`, `POSTGRES_URI`, `OPENAI_API_KEY`, `JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_SENDER`.
- `frruit-webapp/` — React (CRA) frontend, port 3000. Run with `npm install && npm start`. Set `REACT_APP_API_URL` (e.g. `http://localhost:4000`).

Postgres is required; tables are created automatically on backend boot.
