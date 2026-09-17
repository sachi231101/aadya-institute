# Local network access (localhost + LAN + ngrok)

Run one local stack and reach it three ways at once: this machine, devices on the same Wi‑Fi, and remote users via ngrok.

## Prerequisites

- Backend and frontend running in development (`npm run dev` in each)
- For a public URL only: install the [ngrok CLI](https://ngrok.com/download) (not an npm package), then:

```powershell
winget install --id Ngrok.Ngrok
ngrok config add-authtoken <YOUR_TOKEN>
```

## Start the apps

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Vite listens on all interfaces (`host: true`). The frontend uses `VITE_API_URL=/api/v1`, so API and WebSocket traffic go through the Vite proxy to `localhost:5000`.

## Access URLs

| Who | URL |
|-----|-----|
| This machine | `http://localhost:5173` |
| Same Wi‑Fi | `http://<LAN-IP>:5173` |
| Other networks | ngrok HTTPS Forwarding URL |

### Find your LAN IP (Windows)

```powershell
ipconfig
```

Use the IPv4 address of your active adapter (often Wi‑Fi), e.g. `http://192.168.1.10:5173`.

If LAN devices cannot connect, allow inbound traffic for Node/Vite on port **5173** in Windows Firewall.

### Public URL with ngrok

```bash
ngrok http 5173
```

Share the printed HTTPS Forwarding URL (e.g. `https://….ngrok-free.app`). One tunnel to Vite is enough — `/api` and `/ws` are proxied to the backend.

Free ngrok URLs change each time you restart unless you use a reserved domain. The free tier may show a browser interstitial on first visit.

Vite must allow ngrok hostnames (`allowedHosts` in `vite.config.ts`). If you see **403 Forbidden** via ngrok, restart the frontend after that config is present.

## Webhooks and invite links

While ngrok is running, point backend env at the same HTTPS origin:

```env
FRONTEND_URL=https://YOUR-SUBDOMAIN.ngrok-free.app
CORS_ORIGIN=https://YOUR-SUBDOMAIN.ngrok-free.app
PUBLIC_API_BASE_URL=https://YOUR-SUBDOMAIN.ngrok-free.app
```

Restart the backend after changing these values.
