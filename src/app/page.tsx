import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const featureHighlights = [
  {
    title: "Instant static deployments",
    description:
      "Upload a zipped build or connect automation. We scan, extract, and publish globally within seconds.",
    badge: "Fast onboarding",
  },
  {
    title: "Zero-cost research tier",
    description:
      "Host unlimited static sites under *.hosting.noesisai.org or attach domains you already own — no invoices, no catch.",
    badge: "Free tier",
  },
  {
    title: "Production hardening",
    description:
      "Antivirus scanning, nginx provisioning, cache headers, and logging are wired in by default for every deploy.",
    badge: "Secure by design",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Create your workspace",
    copy: "Register with email and password. Every action is tracked with immutable audit trails.",
  },
  {
    step: "02",
    title: "Upload or automate",
    copy: "Drop a zipped dist/ folder (150 MB max) or plug in the upcoming CI hooks. Every archive is scanned before extraction.",
  },
  {
    step: "03",
    title: "Map your domains",
    copy: "Follow the guided wizard to verify DNS or instantly receive a sandbox subdomain on hosting.noesisai.org.",
  },
  {
    step: "04",
    title: "Operate with confidence",
    copy: "Redeploy, roll back, toggle security presets, and request purchases without leaving the dashboard.",
  },
];

const tutorialSteps = [
  {
    title: "1. Point DNS",
    items: [
      "Create an A record to the Noesis edge IP.",
      "Proxy through Cloudflare? Add an orange-cloud CNAME for www → root.",
      "Propagation status refreshes every minute in the dashboard.",
    ],
  },
  {
    title: "2. Upload your bundle",
    items: [
      "Compress your static output (dist/, out/, build/).",
      "Drag & drop — larger archives are rejected to keep the edge fast.",
      "ClamAV scanning runs before extraction and nginx is provisioned automatically.",
    ],
  },
  {
    title: "3. Ship and monitor",
    items: [
      "Trigger redeploys any time and roll back in one click.",
      "Enforce HTTPS, enable access logging, and adjust firewall presets per site.",
      "Upcoming: invite collaborators with granular permissions.",
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="pb-24">
      <section className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-24 md:pt-32">
        <Card className="border-border/50 bg-card/80 shadow-[0_40px_120px_-80px_rgba(0,0,0,0.65)] backdrop-blur">
          <CardContent className="space-y-10 px-8 py-12 md:px-16">
            <div className="space-y-6">
              <Badge variant="outline" className="border-border/60 bg-transparent px-4 py-1 text-[11px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
                Noesis AI infrastructure
              </Badge>
              <h1 className="text-balance text-4xl font-semibold leading-tight md:text-6xl">
                Host static experiences with production discipline — for the price of curiosity.
              </h1>
              <p className="max-w-3xl text-lg text-muted md:text-xl">
                Noesis Hosting delivers zero-cost deployments for research collectives, indie builders, and early-stage labs. Upload a build, attach a domain, and ship globally with automated TLS, antivirus scanning, and a minimal control centre crafted in Milan.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  className="rounded-full px-7 text-sm font-semibold tracking-wide"
                  asChild
                >
                  <Link href="/signup">Create free account</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-border/60 bg-transparent px-7 text-sm font-semibold tracking-wide text-foreground transition hover:bg-card/60"
                  asChild
                >
                  <Link href="/login">Access dashboard</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {featureHighlights.map((feature) => (
                <Card key={feature.title} className="h-full border-border/40 bg-card/70">
                  <CardHeader className="space-y-4">
                    <Badge variant="outline" className="w-fit border-border/50 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-muted-foreground">
                      {feature.badge}
                    </Badge>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted">
                    {feature.description}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto mt-24 flex max-w-6xl flex-col gap-10 px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="border-border/50 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Workflow
            </Badge>
            <h2 className="text-3xl font-semibold md:text-4xl">Opinionated for safety, polished for builders.</h2>
            <p className="max-w-xl text-sm text-muted">
              Every step is automated yet transparent. Focus on your science while Noesis handles the infrastructure choreography.
            </p>
          </div>
          <Button variant="link" className="group h-10 gap-2 self-start px-0 text-sm font-medium text-muted hover:text-foreground" asChild>
            <Link href="/login">
              Explore the dashboard
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {workflowSteps.map((entry) => (
            <Card key={entry.step} className="border-border/40 bg-card/70">
              <CardHeader className="space-y-3">
                <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-3 py-[6px] text-[11px] tracking-[0.45em] text-muted-foreground">
                  {entry.step}
                </Badge>
                <CardTitle className="text-2xl">{entry.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-relaxed text-muted">
                {entry.copy}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-[7fr,5fr]">
          <Card className="border-border/40 bg-card/70">
            <CardHeader className="space-y-4">
              <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Security
              </Badge>
              <CardTitle className="text-3xl">Enterprise hygiene without enterprise friction.</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-muted">
                <li>• ClamAV scanning runs before every extraction — nothing malicious reaches your edge.</li>
                <li>• Strict MIME validation, enforced HTTPS, and optional access gating per site.</li>
                <li>• Hardened nginx config with caching and isolation per domain.</li>
                <li>• Comprehensive audit history for deployments, DNS updates, and future collaborators.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="flex flex-col justify-between border-border/40 bg-card/70">
            <CardHeader className="space-y-4">
              <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Pricing
              </Badge>
              <CardTitle className="text-3xl">Transparent, sustainable, and open.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-4xl font-semibold">Free</p>
                <p className="mt-2 text-sm text-muted">
                  Unlimited static sites • 150 MB per deploy • Automated TLS • Antivirus scanning • Guided DNS.
                </p>
              </div>
              <Separator className="bg-border/50" />
              <div className="space-y-2 text-sm text-muted">
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Coming soon</p>
                <ul className="space-y-2">
                  <li>• Domain purchases directly from the dashboard.</li>
                  <li>• Team workspaces with granular permissions.</li>
                  <li>• Edge analytics and performance budgets.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6">
        <Card className="border-border/40 bg-card/75 px-6 py-10 md:px-12 md:py-14">
          <div className="space-y-6">
            <Badge variant="outline" className="w-fit border-border/50 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Guided tutorial
            </Badge>
            <div className="space-y-3">
              <h2 className="text-3xl font-semibold md:text-4xl">From archive to live domain in three deliberate steps.</h2>
              <p className="text-sm text-muted">
                Whether you are experimenting under a sandbox subdomain or mapping production DNS, the dashboard walks you through each action with live validation.
              </p>
            </div>
          </div>
          <Separator className="my-10 bg-border/50" />
          <div className="grid gap-8 md:grid-cols-3">
            {tutorialSteps.map((block) => (
              <div key={block.title} className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">{block.title}</h3>
                <ul className="space-y-3 text-sm text-muted">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mx-auto mt-24 max-w-6xl px-6">
        <Card className="border-border/40 bg-card/70">
          <CardContent className="grid gap-10 px-8 py-10 md:grid-cols-[2fr,1fr] md:items-center md:px-12">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Join the movement
              </Badge>
              <h2 className="text-3xl font-semibold md:text-4xl">
                Noesis Hosting is crafted for human-centric AI builders.
              </h2>
              <p className="text-sm text-muted">
                Founded in Milan by Mattia Beltrami, Noesis AI builds open infrastructure that feels deliberate, honest, and elegant. We believe the future of intelligence should be hosted with care.
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted">
              <p>👉 GitHub: github.com/noesisai-lab</p>
              <p>✉️ Contact: info@noesisai.org</p>
              <p>📜 License: Noesis AI License Agreement</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
