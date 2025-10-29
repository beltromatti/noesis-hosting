<div align="center">

# Noesis Hosting

**Zero-cost static hosting for the Noesis AI community.**  
Upload zipped builds, wire up domains, and manage security-safe deployments from a dark, minimal dashboard.

</div>

---

## ✨ Features

- **Guided onboarding** – marketing site, onboarding copy, and legal pages tailored to the Noesis AI manifesto.
- **Account system** – email/password signup, login and session cookies stored in PostgreSQL.
- **Site management** – create sites, upload zipped static bundles, trigger redeploys, and track deployment history.
- **Security automation** – ClamAV scanning, nginx config generation, HTTPS enforcement toggles, firewall presets.
- **Domain handling** – free subdomains under `hosting.noesisai.org`, custom domain assignment, and purchase-request workflow scaffolding.
- **Infrastructure hooks** – nginx snippets dropped into `/etc/nginx/hosted-sites`, PM2 process for production runtime.
- **DNS monitoring** – scheduled checks verify that primary domains resolve to the configured edge IP (or Cloudflare orange-cloud proxies) with status surfaced in the dashboard.

## 🛠️ Stack

- [Next.js 16 (App Router)](https://nextjs.org/) + React 19
- Tailwind CSS v4 (atomic CSS via `@tailwindcss/postcss`)
- PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- PM2 process manager
- nginx as reverse proxy / static server
- ClamAV (`clamscan`/`clamdscan`) for malware scanning

## 📦 Project layout

```
.
├── prisma/                 # Prisma schema and migrations
├── src/
│   ├── app/                # App Router routes (marketing, auth, dashboard, APIs)
│   ├── components/         # Client components (forms, dashboard)
│   └── lib/                # Prisma client, env parsing, auth, site helpers
├── middleware.ts           # Session-aware redirects for auth-protected routes
├── package.json
└── README.md
```

## ⚙️ Environment

Create a `.env` (see `.env.example` if you add one) with:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
SESSION_SECRET="32+ char random string"
PLATFORM_UPLOAD_ROOT="/var/www/noesis-hosting/sites"
PLATFORM_UPLOAD_TMP="/var/www/noesis-hosting/tmp"
PLATFORM_NGINX_SNIPPETS="/etc/nginx/hosted-sites"
PLATFORM_FREE_DOMAIN="hosting.noesisai.org"
PLATFORM_EDGE_IP="13.62.103.65"
MAX_ARCHIVE_SIZE_MB="150"
```

Ensure the upload directories exist and are writable by the runtime user.

`PLATFORM_EDGE_IP` is the public IPv4 address your domains should resolve to; the dashboard uses it to flag DNS propagation.

## 🧑‍💻 Local development

```bash
pnpm install
pnpm prisma migrate dev         # sets up the local database
pnpm dev                        # runs Next.js on http://localhost:3000
```

Useful scripts:

```bash
pnpm lint
pnpm build
pnpm start                      # production server (honours $PORT)
```

## 🗃️ Database & Prisma

- `pnpm prisma migrate dev --name <migration>` – create & apply schema changes.
- `pnpm prisma generate` – regenerate typed client after schema changes.
- Production uses PostgreSQL (`hosting_platform` database, user `hosting_admin`).

## 🧾 Upload pipeline

1. Client uploads a `.zip` via `/api/sites/[siteId]/deploy`.
2. Archive is saved to `PLATFORM_UPLOAD_TMP`.
3. ClamAV (`clamdscan` or fallback `clamscan`) scans the file.
4. Contents extract into the site's storage directory under `PLATFORM_UPLOAD_ROOT`.
5. nginx snippet generated per domain and written to `PLATFORM_NGINX_SNIPPETS`.
6. nginx reload attempted via `systemctl reload nginx`.

## 🚀 Production notes

- PM2 process: `pm2 start /usr/bin/bash --name noesis-hosting -- -lc 'PORT=3100 pnpm start'`
- Save process list after changes: `pm2 save`
- nginx upstream: `hosting.noesisai.org` → `127.0.0.1:3100`
- Generated snippets included via `/etc/nginx/conf.d/hosted-sites.conf`
- Translator app remains at `translator.noesisai.org` (port 3000)

Ensure Cloudflare (or your DNS provider) points:

- `hosting.noesisai.org` A → server IP (proxied recommended)
- `translator.noesisai.org` A → server IP
- Root/`www` → server IP for the static home page deployed previously

## 🧪 Testing checklist

- Run `pnpm lint && pnpm build` before deploying.
- Perform manual smoke test: signup, create site, upload sample zip, verify nginx snippet.
- Monitor logs: `pm2 logs noesis-hosting` and `/var/log/nginx/error.log`.

## 🤝 Contributing

1. Fork / branch from `main`.
2. Install dependencies (`pnpm install`).
3. Create migrations if touching the data layer.
4. Open PR with a clear description and testing notes.

## 📄 License

This project is part of the **Noesis AI** open-source initiative. Usage is governed by the Noesis AI License Agreement – ensure ethical compliance before deploying derivatives.
