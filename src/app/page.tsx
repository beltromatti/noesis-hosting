'use client';

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Globe2,
  Server,
  CloudLightning,
  LineChart,
} from "lucide-react";

const heroHighlights = [
  "Self-host the control plane on your own infrastructure",
  "Automated TLS, antivirus scanning, DNS checks, and runtime profiles",
  "Rebrand it, extend it, and build your own hosting service from here",
];

const headlineStats = [
  { value: "150 MB", label: "Default deployment bundle size" },
  { value: "3 runtimes", label: "Static, SPA, and PHP profiles" },
  { value: "DNS + TLS", label: "Cloudflare and ACME-ready workflows" },
];

const featureColumns = [
  {
    title: "Hosting-grade reliability",
    description:
      "Every archive can be scanned by ClamAV, analyzed before activation, and served through an nginx-first deployment pipeline designed for real hosting operations.",
    icon: ShieldCheck,
  },
  {
    title: "Domain workflows built in",
    description:
      "Create managed subdomains, connect custom hostnames, check DNS propagation, and plug into Cloudflare automation when your platform is ready to operate at scale.",
    icon: Globe2,
  },
  {
    title: "A product shell you can own",
    description:
      "Use the codebase as the base for your own hosting brand. Change the landing page, add pricing, wire billing, tune quotas, and shape the product around your market.",
    icon: Sparkles,
  },
  {
    title: "Designed for operators",
    description:
      "A focused control centre for deployments, site status, domain requests, security toggles, and admin metrics, with the primitives needed to run a hosting platform.",
    icon: Server,
  },
];

const sustainabilityPillars = [
  {
    title: "Self-hosted by design",
    copy:
      "Noesis Hosting is not currently operated as a public hosted service. You deploy it on your own server and decide the rules, branding, domains, and roadmap.",
    icon: Server,
  },
  {
    title: "Infrastructure hooks included",
    copy:
      "The codebase already contains practical hooks for nginx, Cloudflare DNS, ACME certificates, ClamAV scanning, PostgreSQL persistence, and PM2 deployment.",
    icon: LineChart,
  },
  {
    title: "Built to become a business",
    copy:
      "Start from a polished technical base, then add billing, teams, quotas, plans, logs, object storage, Git deployments, or any vertical feature your hosting product needs.",
    icon: Sparkles,
  },
];

const workflow = [
  {
    title: "Clone and configure",
    details: [
      "Point the app at your PostgreSQL database and set the domain, upload, DNS, certificate, and security environment variables.",
      "Run migrations and start the Next.js application locally or behind your reverse proxy.",
    ],
  },
  {
    title: "Wire the hosting stack",
    details: [
      "Connect nginx snippets, upload directories, ClamAV, Cloudflare credentials, and optional ACME wildcard certificates.",
      "Tune runtime limits, archive size, security defaults, and domain behavior for your own infrastructure.",
    ],
  },
  {
    title: "Launch your platform",
    details: [
      "Rebrand the interface, invite users, create sites, upload bundles, and monitor deployments from the dashboard.",
      "Extend the product with billing, teams, CLI deploys, logs, or managed plans when you are ready.",
    ],
  },
];

const faqs = [
  {
    question: "Is Noesis Hosting currently available as a hosted public service?",
    answer:
      "No. This repository is currently provided as a self-hostable project. You can deploy it on your own infrastructure and adapt it into your own hosting service.",
  },
  {
    question: "What can I deploy?",
    answer:
      "Static sites, documentation portals, SPA-style front ends, and lightweight PHP applications. Deployments are ZIP archives and should include an index.html, index.htm, or index.php entry point.",
  },
  {
    question: "Can I use this to build a commercial hosting product?",
    answer:
      "Yes. The project is MIT licensed, so you can rebrand it, modify it, add billing, change quotas, and build a service around it, subject to the license terms.",
  },
  {
    question: "What infrastructure do I need?",
    answer:
      "You need a Node.js runtime, PostgreSQL, writable upload directories, nginx integration, and optional Cloudflare, ACME, ClamAV, PHP-FPM, and ipinfo credentials depending on which features you enable.",
  },
];

export default function LandingPage() {
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const xPercent = (event.clientX / window.innerWidth) * 100;
      const yPercent = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--pointer-x", `${xPercent}%`);
      document.documentElement.style.setProperty(
        "--pointer-y",
        `${Math.min(Math.max(yPercent, 10), 70)}%`,
      );
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <main className="overflow-hidden pb-32">
      <section className="landing-hero">
        <div className="glow-orb glow-orb--one" />
        <div className="glow-orb glow-orb--two" />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center space-y-10">
          <span className="floating-tagline">
            <Sparkles className="h-4 w-4 text-indigo-300" />
            Self-hostable hosting platform starter
          </span>
          <div className="space-y-6">
            <h1 className="text-balance text-4xl font-semibold leading-tight text-foreground md:text-6xl">
              Build your own hosting platform with a polished control plane from day one.
            </h1>
            <p className="text-lg text-slate-300 md:text-xl">
              Noesis Hosting packages site management, ZIP deployments, DNS workflows, security
              controls, runtime profiles, and admin analytics into a product-ready web app you can
              self-host, rebrand, and evolve into your own hosting service.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="cta-button primary">
              Begin deploying
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="cta-button secondary">
              Enter control centre
            </Link>
          </div>
          <div className="divider-gradient" />
          <ul className="grid w-full gap-4 text-left sm:grid-cols-3">
            {headlineStats.map((item) => (
              <li key={item.label} className="stat-badge">
                <span className="text-2xl font-semibold text-foreground">{item.value}</span>
                <span className="text-xs uppercase tracking-[0.25em] text-slate-400">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 text-left text-xs text-slate-400 sm:grid-cols-3 sm:text-sm">
            {heroHighlights.map((highlight) => (
              <div key={highlight} className="rounded-2xl border border-slate-700/40 bg-slate-900/40 px-4 py-3">
                {highlight}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-panel">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="badge-label">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-300" />
            Why builders choose Noesis
          </span>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Product polish with infrastructure instincts.
          </h2>
          <p className="text-base text-slate-300 md:text-lg">
            Whether you are prototyping a niche PaaS, building an internal deployment portal, or
            studying how hosting systems fit together, Noesis Hosting gives you the full-stack
            starting point: interface, database, automation hooks, and operational defaults.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {featureColumns.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="tilt-card">
                <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-slate-700/50 bg-slate-900/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                  <Icon className="h-4 w-4 text-indigo-300" />
                  Insight
                </div>
                <h3 className="text-2xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-panel">
        <div className="grid gap-12 md:grid-cols-[3fr,2fr] md:items-start">
          <div className="space-y-6">
            <span className="badge-label">
              <Server className="h-3.5 w-3.5 text-cyan-300" />
              Self-hosting promise
            </span>
            <h2 className="text-3xl font-semibold md:text-4xl">
              Your infrastructure, your brand, your hosting roadmap.
            </h2>
            <p className="text-base leading-relaxed text-slate-300">
              This project is not currently operated as a public hosted service. It is a strong
              technical base for founders, students, and builders who want to launch their own
              hosting experience and adapt every layer to their users.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/signup" className="cta-button primary">
                Try the dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/login" className="cta-button secondary">
                Enter control centre
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {sustainabilityPillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-3xl border border-slate-700/30 bg-slate-900/40 p-6 shadow-[0_30px_80px_-70px_rgba(89,100,249,0.7)]"
              >
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-200">
                  {pillar.icon && <pillar.icon className="h-4 w-4 text-indigo-300" />}
                  {pillar.title}
                </div>
                <p className="text-sm text-slate-300">{pillar.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-panel">
        <div className="mx-auto max-w-2xl text-center space-y-4">
          <span className="badge-label">
            <Server className="h-3.5 w-3.5 text-cyan-300" />
            Launch playbook
          </span>
          <h2 className="text-3xl font-semibold md:text-4xl">Three deliberate steps to the live edge.</h2>
          <p className="text-base text-slate-300">
            The workflow is intentionally opinionated so you can move from source code to a working
            hosting control plane without designing every primitive from scratch.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {workflow.map((block, index) => (
            <article key={block.title} className="tilt-card">
              <div className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-indigo-200">
                Step {String(index + 1).padStart(2, "0")}
              </div>
              <h3 className="text-xl font-semibold text-foreground">{block.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {block.details.map((detail) => (
                  <li key={detail} className="flex gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <span className="badge-label">
            <CloudLightning className="h-3.5 w-3.5 text-teal-300" />
            Questions & clarity
          </span>
          <h2 className="text-3xl font-semibold md:text-4xl">Frequently asked by the community.</h2>
          <p className="text-base text-slate-300">
            The short version: Noesis Hosting is a self-hostable codebase for building your own
            hosting platform, not a currently operated public hosting service.
          </p>
        </div>
        <div className="mt-10 grid gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="rounded-3xl border border-slate-700/40 bg-slate-900/40 p-6 text-left shadow-[0_24px_60px_-55px_rgba(99,102,241,0.6)]"
            >
              <summary className="cursor-pointer text-lg font-semibold text-foreground marker:text-indigo-300">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section-panel">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="badge-label">
            <CloudLightning className="h-3.5 w-3.5 text-teal-300" />
            Build from here
          </span>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Turn the codebase into the hosting product you want to launch.
          </h2>
          <p className="text-base text-slate-300 md:text-lg">
            Start with the included dashboard, deployment pipeline, DNS hooks, analytics model, and
            security controls. Then add the commercial, operational, and brand layers that make the
            platform yours.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="cta-button primary">
              Launch your first project
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="cta-button secondary"
            >
              Open control centre
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
