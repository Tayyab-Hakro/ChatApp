# Gather frontend

A React and Vite frontend for the Gather messaging app.

## Run locally

```sh
npm install
npm run dev
```

Create a `.env` from `.env.example` when connecting the frontend to the API and Socket.IO server. The current interface runs in preview mode with in-memory sample conversations; authentication, messaging, and uploads are not persisted or connected to a backend.

Use `npm run build` to create the production bundle and `npm run preview` to serve it locally.
