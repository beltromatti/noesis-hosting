<p align="center">
  <img src="./public/noesis-hosting-banner.svg" alt="Noesis Hosting banner" width="100%" />
</p>

<h1 align="center">Noesis Hosting</h1>

<p align="center">
  <strong>A self-hostable web app for building your own modern hosting platform.</strong>
</p>

<p align="center">
  <a href="#features"><img alt="Hosting Platform" src="https://img.shields.io/badge/platform-hosting-38bdf8?style=for-the-badge"></a>
  <a href="#tech-stack"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs"></a>
  <a href="#tech-stack"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white"></a>
  <a href="#tech-stack"><img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-4169e1?style=for-the-badge&logo=postgresql&logoColor=white"></a>
  <a href="#license"><img alt="License" src="https://img.shields.io/badge/license-MIT-10b981?style=for-the-badge"></a>
</p>

---

## Overview

**Noesis Hosting** is a full-stack web application for launching a hosting-platform experience: users can create sites, upload deployable archives, manage domains, monitor deployment health, and operate a security-conscious hosting control panel from one polished dashboard.

This repository is **not currently hosted as a public service**. It is distributed as a self-hostable project: clone it, deploy it on your own infrastructure, adapt the branding, wire it to your own DNS/server stack, and use it as the base for your own hosting product.

The project was created by **Mattia Beltrami**, Computer Engineering student at **Politecnico di Milano**.

## Why It Stands Out

Noesis Hosting is designed to feel like the backbone of a real hosting company, not a toy dashboard. It combines a modern product interface with practical infrastructure automation:

- A clean landing experience, authentication flow, dashboard, admin console, and API surface.
- Site creation with generated slugs and managed free-subdomain style domains.
- ZIP-based deployments with archive validation, extraction, runtime detection, and deployment history.
- Support for static sites, SPA-style bundles, and PHP entry points.
- nginx snippet generation for hosted domains.
- Cloudflare-aware DNS automation and DNS status checks.
- ACME/Let's Encrypt wildcard certificate automation for sandbox subdomains.
- ClamAV upload and deployment scanning.
- Per-site security configuration, including HTTPS policy, access logging, auto-indexing, basic-auth toggles, and firewall metadata.
- Usage analytics, user analytics, risk scoring, deployment counters, DNS insights, and admin metrics.
- PostgreSQL persistence through Prisma migrations.

## Features

| Area | What You Get |
| --- | --- |
| **Hosting control panel** | Create, pause, resume, delete, and inspect hosted sites from a dashboard built for operators. |
| **Deployments** | Upload `.zip` bundles, scan them, extract them into isolated storage, infer runtime, and keep deployment history. |
| **Runtime profiles** | Static, SPA, and PHP-oriented profiles with CPU, memory, storage, and process-limit metadata. |
| **Domains** | Free subdomain pattern, custom-domain updates, Cloudflare DNS provisioning hooks, and live DNS checks. |
| **Security** | ClamAV scanning, symbolic-link rejection, path traversal protection, HTTPS defaults, access logging, and security profiles. |
| **Analytics** | Site and user analytics, auth-event logging, geo/device enrichment through ipinfo, risk reasons, and admin-level metrics. |
| **Operations** | nginx integration, PM2 production process notes, PostgreSQL data model, Prisma migrations, and environment-driven configuration. |

## Self-Hosting Positioning

Noesis Hosting is meant to be a launchpad for builders who want to create their own hosting service.

You can use it to:

- prototype a Vercel/Netlify-style dashboard for a niche hosting product;
- build a private hosting platform for clients, students, teams, or internal tools;
- study how hosting workflows connect UI, database state, DNS, uploads, scanning, and nginx;
- rebrand the interface and evolve it into your own commercial or community hosting platform.

You bring the server, domain, DNS provider, database, and operational policies. This repository gives you the product shell and implementation base to move faster.

## Tech Stack

- **Next.js 16** with App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Prisma ORM**
- **PostgreSQL**
- **Cloudflare API hooks** for DNS automation
- **ACME / Let's Encrypt** via `acme-client`
- **nginx** for domain routing and static/PHP serving
- **PM2** for process management
- **ClamAV** for malware scanning
- **ipinfo** for optional auth-event enrichment

## Project Structure

```txt
.
├── prisma/                 # Prisma schema and migrations
├── public/                 # Static assets, including the README banner
├── src/
│   ├── app/                # App Router pages and API routes
│   ├── components/         # Dashboard, auth, and UI components
│   └── lib/                # Auth, deployments, DNS, certs, analytics, Prisma helpers
├── middleware.ts           # Session-aware route protection
├── package.json
└── README.md
```

## Environment

Create a `.env` file with values for your infrastructure:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
SESSION_SECRET="32+ char random string"

PLATFORM_UPLOAD_ROOT="/var/www/noesis-hosting/sites"
PLATFORM_UPLOAD_TMP="/var/www/noesis-hosting/tmp"
PLATFORM_NGINX_SNIPPETS="/etc/nginx/hosted-sites"
PLATFORM_FREE_DOMAIN="hosting.example.com"
PLATFORM_EDGE_IP="203.0.113.10"
PLATFORM_ZONE_NAME="example.com"

CLOUDFLARE_EMAIL="your-cloudflare-email@example.com"
CLOUDFLARE_API_KEY="your-global-api-key"

MAX_ARCHIVE_SIZE_MB="150"
IPINFO_TOKEN="optional-api-token-for-ipinfo"
IPINFO_CACHE_TTL_MINUTES="720"

PLATFORM_CERT_ROOT="/etc/letsencrypt/noesis-hosting"
ACME_ACCOUNT_EMAIL="admin@example.com"

PLATFORM_PHP_FPM_POOL_DIR="/etc/php/8.3/fpm/pool.d"
PLATFORM_PHP_FPM_SOCKET_ROOT="/run/php/noesis-hosting"
PLATFORM_PHP_FPM_SERVICE="php8.3-fpm"

DEFAULT_RUNTIME_CPU_PERCENT="25"
DEFAULT_RUNTIME_MEMORY_MB="256"
DEFAULT_RUNTIME_PROCESS_LIMIT="12"
```

Make sure your upload directories, nginx snippet directory, certificate directory, and PHP-FPM paths are writable by the runtime user that operates the platform.

## Local Development

```bash
pnpm install
pnpm prisma migrate dev
pnpm dev
```

The development server runs at:

```txt
http://localhost:3000
```

Useful commands:

```bash
pnpm lint
pnpm build
pnpm start
pnpm prisma generate
```

## Deployment Flow

1. A user creates a site from the dashboard.
2. The platform assigns a slug and prepares storage.
3. The user uploads a `.zip` archive.
4. The archive is size-checked and scanned with ClamAV.
5. The archive is extracted with path-traversal and symlink protections.
6. The platform analyzes the deployment tree and infers runtime.
7. Site security profile and analytics are updated.
8. nginx configuration snippets are generated.
9. DNS and certificate automation can be connected to your Cloudflare and ACME setup.

## Production Checklist

Before running your own instance:

- Configure PostgreSQL and run Prisma migrations.
- Configure `SESSION_SECRET` with a strong random value.
- Install and verify ClamAV (`clamdscan` or `clamscan`).
- Configure nginx includes for generated site snippets.
- Configure Cloudflare credentials if you want automated DNS records.
- Configure ACME email/certificate paths if you want wildcard certificate automation.
- Set correct filesystem permissions for upload, temp, certificate, nginx, and PHP-FPM directories.
- Run `pnpm lint` and `pnpm build`.

Example PM2 process:

```bash
pm2 start /usr/bin/bash --name noesis-hosting -- -lc 'PORT=3100 pnpm start'
pm2 save
```

## Customization Ideas

- Replace the Noesis brand with your own hosting company identity.
- Change the domain model from sandbox subdomains to paid plans or private workspaces.
- Add billing, team accounts, quotas, CLI deployments, Git-based deployments, or object storage.
- Extend runtime support beyond static, SPA, and PHP.
- Add queue workers for heavy deployment orchestration.
- Connect observability providers for logs, metrics, uptime checks, and alerts.

## Tags

`hosting-platform` `self-hosted` `nextjs` `typescript` `prisma` `postgresql` `cloudflare` `nginx` `clamav` `web-app` `paas` `developer-tools`

## Author

Built by **Mattia Beltrami**, Computer Engineering student at **Politecnico di Milano**.

## License

Released under the **MIT License**. See [LICENSE](./LICENSE) for details.
