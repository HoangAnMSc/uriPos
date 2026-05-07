# Render Deploy Guide

## Architecture

- `backend`: Render Web Service using Docker
- `react-frontend`: Render Static Site
- `react-admin`: Render Static Site

The repo includes a root `render.yaml` for Blueprint-based setup.

## What changed from Railway

- Removed `backend/nixpacks.toml` because it was specific to Railway/Nixpacks.
- Added `backend/Dockerfile` so Laravel can run on Render.
- Frontends now support `VITE_API_ORIGIN` instead of forcing a full `VITE_API_URL`.
- Admin storefront links now use `VITE_STOREFRONT_URL` instead of hardcoded production domains.

## Deploy steps

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Render, choose `New > Blueprint`.
3. Connect the repo and select the root `render.yaml`.
4. Provide the required secret env vars for `apos-backend`:
   - `APP_KEY`
   - `DB_CONNECTION`
   - `DB_URL`
   - `RUN_SEED_ON_DEPLOY`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - Optional: `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN`
5. Let Render create:
   - `apos-backend`
   - `apos-storefront`
   - `apos-admin`

## Backend env notes

- `APP_KEY`: generate with `php artisan key:generate --show`
- `DB_CONNECTION`: usually `pgsql` for Render Postgres, or `mysql` if you keep another provider
- `DB_URL`: use your database connection URL
- `RUN_SEED_ON_DEPLOY`: set `true` only for a brand-new empty database, then switch it back to `false`
- `APP_URL`: auto-filled from Render using `RENDER_EXTERNAL_URL`
- `TRUSTED_PROXIES`: already set to `*` in `render.yaml` for proxy-aware HTTPS handling

## Important free-plan limits

- Free web services spin down after 15 minutes of inactivity.
- Free web services use an ephemeral filesystem.
- Free Render Postgres currently expires 30 days after creation.

If you want long-term production data, use a paid database or another persistent DB provider.
