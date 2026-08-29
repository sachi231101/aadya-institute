# Peak / exam-window ops checklist

Use before a large live exam (hundreds–1000 concurrent students).

## Before

1. Confirm VPS ≥ 8 GB / 4 vCPU; free RAM > 1.5 GB; disk free > 20%.
2. Set in `backend/.env`:
   - `PEAK_MODE=true`
   - `RUN_WORKERS=false` on API PM2 apps
   - `RUN_WORKERS=true` on `aadya-worker`
3. `pm2 restart aadya-api aadya-api-2 aadya-worker`
4. Verify `GET /api/v1/health` returns `"peakMode": true`
5. Verify `GET /api/v1/health/ready` → database up
6. Pause non-essential admin reports / bulk WhatsApp campaigns

## During

Watch:

- CPU / RAM (`htop`)
- Postgres connections (`SELECT count(*) FROM pg_stat_activity;`)
- PM2 (`pm2 monit`)
- API p95 / 5xx (Nginx access/error logs)
- BullMQ: exam-grading lag vs whatsapp lag

## After

1. Set `PEAK_MODE=false` and restart worker + API
2. Resume normal automation concurrency
3. Review slow query log / failed grading jobs
