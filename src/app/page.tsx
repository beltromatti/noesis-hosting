'use client';

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Globe2,
  HeartHandshake,
  Server,
  CloudLightning,
  HeartPulse,
  LineChart,
} from "lucide-react";

const heroHighlights = [
  "Powered by the Noesis AI non-profit foundation",
  "Automatic TLS, antivirus, and sandboxed runtimes on every deploy",
  "Bring your own domain or use our free *.hosting.noesisai.org subdomains",
];

const headlineStats = [
  { value: "0€", label: "Platform fees — permanently" },
  { value: "150 MB", label: "Per deployment bundle size" },
  { value: "Global edge", label: "PoPs optimised for research traffic" },
];

const featureColumns = [
  {
    title: "Foundation-grade reliability",
    description:
      "Every archive is scanned by ClamAV, isolated in its own runtime, and served behind a battle-tested nginx + php-fpm stack. Compliance for public-good projects without enterprise contracts.",
    icon: ShieldCheck,
  },
  {
    title: "Worldwide reach in seconds",
    description:
      "Upload, verify, and publish in minutes. Our orchestration layer propagates DNS, ships TLS, and warms caches automatically so your announcement can reach classrooms, labs, and citizens anywhere.",
    icon: Globe2,
  },
  {
    title: "Transparent donor-backed model",
    description:
      "The infrastructure is sustained entirely by philanthropic donations and optional domain purchases. No upsells, no premium tiers — just open access for builders furthering collective intelligence.",
    icon: HeartHandshake,
  },
  {
    title: "Designed for humans, not tickets",
    description:
      "A focused control centre for launches, rollbacks, domain requests, and security toggles. Thoughtful defaults, delightful animations, and documentation embedded where you need it.",
    icon: Sparkles,
  },
];

const sustainabilityPillars = [
  {
    title: "Philanthropic backbone",
    copy:
      "Private donors and research grants cover compute, bandwidth, and security reviews so independent teams never face a bill.",
    icon: HeartPulse,
  },
  {
    title: "Optional domain commerce",
    copy:
      "Need a custom domain? Purchase directly through Noesis and we reinvest every margin into infrastructure operations.",
    icon: LineChart,
  },
  {
    title: "Open impact reporting",
    copy:
      "Quarterly transparency reports publish usage stats, costs, carbon accounting, and community milestones.",
    icon: Server,
  },
];

const workflow = [
  {
    title: "Create your foundation account",
    details: [
      "Sign up securely with email — no credit card, no hidden tiers.",
      "Instant access to the control centre with guided onboarding.",
    ],
  },
  {
    title: "Deploy with confidence",
    details: [
      "Upload a zipped build or integrate the upcoming CLI to automate.",
      "We scan, extract, and provision a hardened runtime automatically.",
    ],
  },
  {
    title: "Map domains & share your work",
    details: [
      "Link existing domains or request a purchase through the foundation.",
      "Monitor performance, security scans, and DNS propagation in one place.",
    ],
  },
];

const faqs = [
  {
    question: "Is the platform really free forever?",
    answer:
      "Yes. Noesis Hosting is maintained by the Noesis AI Foundation as a public-good infrastructure project. Operational costs are covered by philanthropic funding, research partnerships, and optional add-ons such as domain purchases.",
  },
  {
    question: "What can I deploy?",
    answer:
      "Static sites, documentation portals, lightweight PHP applications, and experimental front-ends. Every deployment must include an index.html or index.php entry point and remain within the 150 MB bundle limit to keep the edge responsive.",
  },
  {
    question: "Can organisations with higher traffic use the platform?",
    answer:
      "Absolutely. The zero-cost tier covers a generous baseline. If you require custom bandwidth, private regions, or compliance reviews, contact the foundation to co-design an appropriate donation-backed runway.",
  },
  {
    question: "How does Noesis ensure security?",
    answer:
      "All uploads are scanned by ClamAV, served from isolated php-fpm pools, and delivered via hardened nginx blueprints. HTTPS is enforced by default, and you can enable access logs, CORS policies, or basic auth per site.",
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
            Noesis AI Foundation · Public Infrastructure
          </span>
          <div className="space-y-6">
            <h1 className="text-balance text-4xl font-semibold leading-tight text-foreground md:text-6xl">
              The open web edge powering everyone from classrooms to civic labs — free, secure, and
              beautifully simple.
            </h1>
            <p className="text-lg text-slate-300 md:text-xl">
              We built Noesis Hosting so that any mission-driven team can launch modern web
              experiences without touching invoices or compromising on reliability. Your work stays
              accessible, resilient, and ethically operated under the umbrella of a global
              non-profit.
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
            Production discipline, philanthropic heart.
          </h2>
          <p className="text-base text-slate-300 md:text-lg">
            Whether you are documenting open-source breakthroughs, hosting an AI literacy portal, or
            launching a civic app, you receive foundation-backed infrastructure engineered to keep
            your message online — no sales calls, no friction.
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
              <HeartHandshake className="h-3.5 w-3.5 text-rose-300" />
              Our sustainability promise
            </span>
            <h2 className="text-3xl font-semibold md:text-4xl">
              Free access for every mission. Transparent funding for every kilobyte.
            </h2>
            <p className="text-base leading-relaxed text-slate-300">
              Noesis Hosting is sustained by generosity, not subscription funnels. The foundation
              underwrites compute and security so educators, NGOs, researchers, and curious makers
              can publish knowledge openly. When you thrive, more people learn, and society gets
              smarter.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="mailto:foundation@noesisai.org" className="cta-button secondary">
                Talk with the foundation
              </Link>
              <Link
                href="https://noesis.ai/donate"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-button primary"
              >
                Make a donation
                <ArrowRight className="h-4 w-4" />
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
            Our workflow is intentionally opinionated so you can move fast without sacrificing
            resilience. Every step comes with inline guidance, pre-flight validation, and
            troubleshooting tips curated by the foundation&apos;s operations team.
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
            Still unsure whether you can rely on a philanthropic edge? Explore our most requested
            answers or write to the foundation at{" "}
            <Link href="mailto:foundation@noesisai.org" className="underline decoration-indigo-400 underline-offset-4">
              foundation@noesisai.org
            </Link>
            .
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
            <HeartHandshake className="h-3.5 w-3.5 text-rose-300" />
            Join the movement
          </span>
          <h2 className="text-3xl font-semibold md:text-4xl">
            Your ideas deserve resilient infrastructure. Noesis keeps the lights on for everyone.
          </h2>
          <p className="text-base text-slate-300 md:text-lg">
            Deploy now, iterate in public, and invite others to build with you. When you are ready to
            give back, contribute a domain purchase or a donation and we will pay it forward to the
            next wave of builders.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="cta-button primary">
              Launch your first project
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="mailto:partnerships@noesisai.org"
              className="cta-button secondary"
            >
              Partnership enquiries
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
