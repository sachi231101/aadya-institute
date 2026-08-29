# Aadya Institute — Production deploy (Hostinger VPS)

## Capacity

For normal academy traffic plus ~1000 concurrent exam students, use at least:

- **8 GB RAM / 4 vCPU** (16 GB preferred)
- Ubuntu 22.04+ LTS

Do not run production peak load on 4 GB / 1 vCPU.

## Stack

| Component | Role |
|-----------|------|
| Nginx | TLS, static frontend, reverse proxy, rate limits |
| Node + PM2 | `aadya-api` (HTTP/WS) + `aadya-worker` (BullMQ) |
| PostgreSQL | Source of truth |
| Redis | Queues, rate limits, short TTL cache |

## Quick start

1. Install Node 20+, Postgres, Redis, Nginx, Certbot, PM2.
2. Clone repo; copy `backend/.env.example` → `backend/.env` and set production values.
3. Set `DATABASE_URL` with Prisma pool params, e.g.  
   `...?connection_limit=15&pool_timeout=20`
4. Set `CORS_ORIGIN` to your public frontend URL(s), e.g. `https://app.yourdomain.com`  
   (comma-separated if you have more than one)
5. Set `RUN_WORKERS=false` for the API process (PM2 ecosystem does this).
6. Set `PEAK_MODE=false` normally; `true` during large live exams.
7. Build backend + frontend; point Nginx `root` at `frontend/dist`.
8. Copy [nginx/aadya.conf](nginx/aadya.conf), replace `YOUR_DOMAIN`, enable site, Certbot.
9. Apply [redis/redis-aadya.conf](redis/redis-aadya.conf) snippets (or include).
10. Start: `pm2 start deploy/pm2/ecosystem.config.cjs`
11. `pm2 save` && `pm2 startup`

## Firewall

UFW allow only `22`, `80`, `443`. Never expose `5432` or `6379`.

## Peak / exam window

```bash
# On VPS
pm2 set aadya-worker PEAK_MODE true   # or edit .env and restart worker
# Prefer: set PEAK_MODE=true in backend/.env and `pm2 restart aadya-worker aadya-api`
```

Peak mode throttles low-priority queues (WhatsApp blasts, recording sync) so API + exam grading stay responsive.

## Health

- API: `GET https://YOUR_DOMAIN/api/v1/health`
- Ready (DB): `GET https://YOUR_DOMAIN/api/v1/health/ready`
