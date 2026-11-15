## Hackathon write-up

[Read how we built Buburu in 48 hours on DEV](https://dev.to/ameliadrag/buburu-a-womens-safety-app-built-in-48-hours-born-from-a-walk-we-never-forgot-4j9m)

# Buburu

A safety-first walking app. It finds the safest walking route (it avoids areas reported as dangerous),
shows your live position, 24/7 shops, pharmacies and petrol stations, lets you report problems,
add friends, chat with them and send an SOS.

## Project layout

- `UNIHACK2026-frontend` - React 18, Vite, Leaflet (react-leaflet, leaflet-rotate), Auth0 login
- `UNIHACK2026-backend` - Spring Boot 4, Java 21, Maven, H2 (stored in a file), Auth0 resource server

## Setup

1. Frontend: copy `UNIHACK2026-frontend/.env.example` to `.env` and fill in your Auth0 values
   (`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`).
   `VITE_API_BASE_URL` is the backend origin only, for example `http://localhost:8081`.
2. Backend: copy `UNIHACK2026-backend/.env.example` to `.env` and set `ORS_API_KEY` (OpenRouteService).
   The key stays in the backend and is never sent to the browser.
3. Auth0: add `http://localhost:5173` to Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins,
   and authorize the application for your API.

## Run

Backend, from `UNIHACK2026-backend` (PowerShell):

```powershell
$env:FRONTEND_ORIGIN = 'http://localhost:5173'
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=auth' '-Dspring-boot.run.arguments=--server.port=8081'
```

Frontend, from `UNIHACK2026-frontend`:

```powershell
npm install
npm run dev
```

Then open http://localhost:5173 (use `localhost`, not `127.0.0.1`).

## Notes

- The database is a file (`data/` in the backend folder, ignored by git). Delete it to reset all data.
- Reports expire after 24 hours.
- The safest route and the chat need a signed-in account.
- API details: `UNIHACK2026-backend/FRONTEND_API.md`, `AUTH_SETUP.md`, `ROUTING_SETUP.md`.
