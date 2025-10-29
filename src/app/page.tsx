import Link from "next/link";

const featureHighlights = [
  {
    title: "Instant Static Deployments",
    description:
      "Upload a zipped build or connect a CI pipeline. We unpack, scan for threats, and publish on your domain within seconds.",
    badge: "Fast onboarding",
  },
  {
    title: "Zero-Cost for Open Research",
    description:
      "Host limitless static sites for free under *.hosting.noesisai.org or point a custom domain you already own.",
    badge: "Free tier",
  },
  {
    title: "Production Hardening",
    description:
      "Antivirus scanning, nginx hardening, access logs, and security presets come out of the box with every deployment.",
    badge: "Secure by default",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create your account",
    copy: "Sign up with email and password. Every project lives inside a secure workspace with audit trails.",
  },
  {
    step: "02",
    title: "Upload or connect",
    copy: "Drop a zipped build (max 150 MB) or wire up automation via the coming CI hooks. Every archive is scanned before extraction.",
  },
  {
    step: "03",
    title: "Configure domains",
    copy: "Use the guided DNS wizard to map an existing domain or request a complimentary staging subdomain instantly.",
  },
  {
    step: "04",
    title: "Monitor and evolve",
    copy: "Track deployment history, toggle security rules, and upgrade to custom purchases without leaving the dashboard.",
  },
];

const tutorialSteps = [
  {
    title: "1. Point your DNS",
    items: [
      "Create an A record for your domain pointing to the Noesis edge IP.",
      "Add a proxied CNAME for www → root if you use Cloudflare.",
      "Wait for propagation — we check status automatically.",
    ],
  },
  {
    title: "2. Upload your bundle",
    items: [
      "Compress your static site output — dist/, out/, or build/.",
      "Drag & drop in the dashboard. Files above 150 MB are rejected to keep the edge fast.",
      "We run ClamAV before extraction, then provision nginx and cache headers for you.",
    ],
  },
  {
    title: "3. Ship and monitor",
    items: [
      "Trigger redeploys anytime. Every push is versioned for rollback.",
      "Toggle HTTPS enforcement, access logging, and firewall presets per site.",
      "Invite collaborators (coming soon) with scoped permissions.",
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="pb-24">
      <header className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-20 md:pt-28">
        <div className="flex flex-col gap-6">
          <span className="tag w-max">Open-source infrastructure by Noesis AI</span>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-foreground md:text-6xl">
            Host static experiences with production discipline — for the price of curiosity.
          </h1>
          <p className="max-w-3xl text-lg text-muted md:text-xl">
            Noesis Hosting delivers zero-cost static deployments for research collectives, indie builders, and
            early-stage labs. Upload your build, attach a domain, and ship globally with antivirus scanning,
            automated nginx provisioning, and a dark, minimal control center crafted in Milan.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background shadow-lg shadow-accent/40 transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-outline/60 px-6 py-3 text-sm font-medium text-foreground/80 transition hover:border-accent hover:text-foreground"
            >
              Access dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <div key={feature.title} className="glass-panel glow-border flex flex-col gap-4 p-6">
              <span className="text-xs uppercase tracking-[0.4em] text-accent/80">{feature.badge}</span>
              <h3 className="text-xl font-medium text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted">{feature.description}</p>
            </div>
          ))}
        </div>
      </header>

      <section className="mx-auto mt-24 flex max-w-6xl flex-col gap-12 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-3">
            <span className="tag">Workflow</span>
            <h2 className="text-3xl font-semibold md:text-4xl">Everything you need to go live, opinionated for safety.</h2>
            <p className="text-muted">
              Noesis Hosting is built for human-centric AI teams that care about reliability. Every step is audited,
              versioned, and secured so you can focus on the science.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent transition hover:text-accent/80"
          >
            Explore the dashboard →
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {workflowSteps.map((entry) => (
            <div key={entry.step} className="glass-panel glow-border flex flex-col gap-4 p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-accent/70">{entry.step}</span>
              <h3 className="text-2xl font-medium text-foreground">{entry.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{entry.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 flex max-w-6xl flex-col gap-10 px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="glass-panel glow-border p-8">
            <span className="tag">Security</span>
            <h2 className="mt-4 text-3xl font-semibold">Enterprise hygiene without enterprise friction.</h2>
            <ul className="mt-6 space-y-4 text-sm text-muted">
              <li>• ClamAV antivirus scanning before every extraction — no malware gets past the edge.</li>
              <li>• Strict MIME validation, enforced HTTPS toggles, and optional access gating per site.</li>
              <li>• Automated nginx provisioning with cache headers and custom domain isolation.</li>
              <li>• Full audit trail of deployments, DNS changes, and upcoming collaborator actions.</li>
            </ul>
          </div>
          <div className="glass-panel glow-border flex flex-col gap-6 p-8">
            <div>
              <span className="tag">Pricing</span>
              <h2 className="mt-4 text-3xl font-semibold">Transparent and sustainable.</h2>
            </div>
            <div className="rounded-3xl border border-outline/60 bg-surface-strong/90 p-8 shadow-inner">
              <h3 className="text-4xl font-semibold text-foreground">Free</h3>
              <p className="mt-2 text-sm text-muted">Unlimited static sites • 150 MB per deploy • Automated TLS (via Cloudflare) • Antivirus scanning • Guided DNS.</p>
              <p className="mt-4 text-xs uppercase tracking-[0.3em] text-muted">
                Coming soon
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>• Custom domain purchases from the dashboard.</li>
                <li>• Team workspaces with granular permissions.</li>
                <li>• Edge CDN analytics and performance budgets.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6">
        <div className="glass-panel glow-border p-8 md:p-12">
          <div className="flex flex-col gap-4">
            <span className="tag">Guided Tutorial</span>
            <h2 className="text-3xl font-semibold md:text-4xl">From archive to live domain in three deliberate steps.</h2>
            <p className="text-sm text-muted">
              Whether you are mapping a personal domain or experimenting under a free sandbox, Noesis Hosting walks
              you through the exact DNS and security actions to stay safe.
            </p>
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {tutorialSteps.map((block) => (
              <div key={block.title} className="flex flex-col gap-4">
                <h3 className="text-lg font-medium text-foreground">{block.title}</h3>
                <ul className="space-y-3 text-sm text-muted">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl rounded-3xl border border-outline/50 bg-surface/80 px-6 py-12 text-center shadow-2xl">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <span className="tag self-center">Roadmap</span>
          <h2 className="text-3xl font-semibold">Upcoming: direct domain purchasing, CI integrations, analytics.</h2>
          <p className="text-muted">
            The dashboard already scaffolds domain purchase requests — submit your ideal names and we will handle the
            registrar side soon. Expect GitHub Actions integration, team roles, and observability modules next.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition hover:-translate-y-0.5"
              href="/signup"
            >
              Join the beta
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-full border border-outline/70 px-6 py-3 text-sm font-medium text-foreground/80 transition hover:border-accent"
              href="https://github.com/noesisai-lab"
              target="_blank"
              rel="noopener"
            >
              Contribute on GitHub
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto mt-28 flex max-w-6xl flex-col gap-6 px-6 pb-10">
        <div className="flex flex-col gap-2 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <div>Noesis Hosting is part of the open research initiative Noesis AI (Milan, Italy).</div>
          <div className="flex gap-4 text-muted">
            <Link className="hover:text-accent" href="/terms">
              Terms of Use
            </Link>
            <Link className="hover:text-accent" href="/privacy">
              Privacy Notice
            </Link>
            <a className="hover:text-accent" href="mailto:info@noesisai.org">
              info@noesisai.org
            </a>
          </div>
        </div>
        <div className="text-xs text-muted/70">
          © {new Date().getFullYear()} Noesis AI. Crafted contemporaneously with the open-source AGI manifesto.
        </div>
      </footer>
    </main>
  );
}
