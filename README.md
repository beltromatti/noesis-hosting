<div align="center">

# Noesis Hosting

**A philanthropic, production-grade edge for AI literacy and civic innovation.**  
The Noesis AI Foundation operates this stack so that educators, researchers, NGOs, and curious makers can publish modern web experiences without touching invoices or compromising on reliability.

</div>

---

## ✨ What the platform delivers

- **Foundation-backed reliability** – antivirus scans (ClamAV), isolated php-fpm pools, enforced HTTPS, and hardened nginx blueprints ship with every deployment.
- **Zero-cost hosting** – unlimited sites under `*.hosting.noesisai.org`, optional custom domains, and no premium tiers. Operations are sustained by donations and domain purchases.
- **Minimal, expressive control centre** – bespoke landing page, guided onboarding, account management, usage analytics (including geo/device insights), and transparent audit trails.
- **Automated infrastructure choreography** – zipped bundle uploads, redeploys, rollbacks, DNS provisioning, nginx snippet management, and PM2 supervision baked in.
- **Research-friendly telemetry** – login/device geostatistics, risk scoring for users/sites, deployment history, DNS status, and security posture surfaced through the admin console.

## 🛠️ Tech stack

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
PLATFORM_ZONE_NAME="noesisai.org"
CLOUDFLARE_EMAIL="your-cloudflare-email@example.com"
CLOUDFLARE_API_KEY="your-global-api-key"
MAX_ARCHIVE_SIZE_MB="150"
IPINFO_TOKEN="optional-api-token-for-ipinfo"
```

Ensure the upload directories exist and are writable by the runtime user.

`PLATFORM_EDGE_IP` is the public IPv4 address your domains should resolve to; the dashboard uses it to flag DNS propagation. `PLATFORM_ZONE_NAME`, `CLOUDFLARE_EMAIL`, and `CLOUDFLARE_API_KEY` allow the platform to mint sandbox DNS records (proxied through Cloudflare) automatically.

`IPINFO_TOKEN` is optional but recommended. When provided, every auth event (signup, login, failed login) is enriched with geolocation, ASN, carrier, and privacy metadata via the ipinfo API and logged for security analytics.

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

## 💚 Funding & ethos

Noesis Hosting is operated by the **Noesis AI Foundation** as part of its mission to democratise AI literacy and civic tooling. Compute, bandwidth, and security reviews are covered by:

- Philanthropic donations and research grants.
- Optional domain purchases routed through the foundation registrar.
- Voluntary contributions from organisations scaling beyond the default quotas.

The platform is open-source under the Noesis AI License Agreement; every contribution should respect the foundation's ethical guidelines and the communities we serve.
