import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Database,
  Globe2,
  MonitorSmartphone,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/session";
import { loadAdminMetrics } from "@/lib/admin/metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Platform Intelligence Console — Noesis Hosting",
};

type TimelinePoint = {
  date: string;
  deployments: number;
  registrations: number;
  failures: number;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[exponent]}`;
}

function formatDateLabel(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function Sparkline({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">No activity recorded yet.</div>;
  }

  const width = 560;
  const height = 160;
  const maxValue = Math.max(
    1,
    ...data.map((point) => Math.max(point.deployments, point.registrations, point.failures)),
  );
  const step = data.length > 1 ? width / (data.length - 1) : width;

  const buildPath = (values: number[]) =>
    values
      .map((value, index) => {
        const x = step * index;
        const normalised = value / maxValue;
        const y = height - normalised * (height - 20) - 10;
        const command = index === 0 ? "M" : "L";
        return `${command}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");

  const deploymentsPath = buildPath(data.map((point) => point.deployments));
  const registrationsPath = buildPath(data.map((point) => point.registrations));
  const failuresPath = buildPath(data.map((point) => point.failures));

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full text-emerald-400"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(148,163,184,0.12)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.02)" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#gridGradient)" />
        {deploymentsPath && (
          <path d={deploymentsPath} fill="none" stroke="rgb(34,197,94)" strokeWidth={2.5} strokeLinecap="round" />
        )}
        {registrationsPath && (
          <path d={registrationsPath} fill="none" stroke="rgb(59,130,246)" strokeWidth={2} strokeLinecap="round" />
        )}
        {failuresPath && (
          <path d={failuresPath} fill="none" stroke="rgb(248,113,113)" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 6" />
        )}
      </svg>
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-2 w-8 rounded bg-emerald-400" />
          Deployments
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-8 rounded bg-blue-400" />
          Registrations
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-8 rounded border border-red-300 bg-transparent" />
          Failed Deployments
        </div>
        <Separator className="hidden flex-1 md:block" />
        <span className="text-muted-foreground">
          {formatDateLabel(data[0].date)} — {formatDateLabel(data[data.length - 1].date)}
        </span>
      </div>
    </div>
  );
}

type RankedItem = {
  label: string;
  count: number;
  percent: number;
};

function RankedList({
  items,
  gradient,
  emptyLabel,
}: {
  items: RankedItem[];
  gradient: string;
  emptyLabel: string;
}) {
  if (!items.length) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  const meaningfulItems = items.filter((item) => item.count > 0);
  if (meaningfulItems.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {meaningfulItems.map((item) => {
        const clampedPercent = Math.min(Math.max(item.percent, 0), 100);
        const width = clampedPercent > 0 ? Math.max(clampedPercent, 6) : 0;
        return (
          <div key={`${item.label}-${item.count}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-foreground">{item.label}</span>
              <span className="tabular-nums">
                {formatNumber(item.count)} · {clampedPercent.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-muted/15">
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", gradient)}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DeviceMeter({
  label,
  value,
  total,
  gradient,
}: {
  label: string;
  value: number;
  total: number;
  gradient: string;
}) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  const clamped = Math.min(Math.max(percent, 0), 100);
  const width = percent > 0 ? Math.max(clamped, 6) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums">
          {formatNumber(value)} · {clamped.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/15">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", gradient)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function RiskBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-red-500/20 text-red-200 border-red-400/40"
      : score >= 50
        ? "bg-amber-500/20 text-amber-200 border-amber-400/40"
        : "bg-emerald-500/20 text-emerald-200 border-emerald-400/30";
  return (
    <Badge variant="outline" className={cn("border text-xs font-medium", tone)}>
      Risk {score}
    </Badge>
  );
}

const RUNTIME_BADGES: Record<string, { label: string; className: string }> = {
  PHP: { label: "PHP sandbox", className: "border-blue-400/40 bg-blue-500/15 text-blue-100" },
  SPA: { label: "Front-end app", className: "border-purple-400/40 bg-purple-500/15 text-purple-100" },
  STATIC: { label: "Static bundle", className: "border-slate-400/40 bg-slate-500/15 text-slate-100" },
  UNKNOWN: { label: "Unknown", className: "border-slate-400/40 bg-slate-500/15 text-slate-200" },
};

const SECURITY_BADGES: Record<string, { label: string; className: string }> = {
  PASS: { label: "Pass", className: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100" },
  WARN: { label: "Warn", className: "border-amber-400/40 bg-amber-500/15 text-amber-100" },
  FAIL: { label: "Fail", className: "border-red-500/50 bg-red-500/15 text-red-100" },
  UNKNOWN: { label: "Pending", className: "border-slate-400/40 bg-slate-500/15 text-slate-200" },
};

export default async function AdminDashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const metrics = await loadAdminMetrics();
  const storageReadable = formatBytes(metrics.overview.totalStorageBytes);
  const activeRatio = metrics.overview.totalSites === 0
    ? 0
    : Math.round((metrics.overview.activeSites / metrics.overview.totalSites) * 100);
  const failureRate =
    metrics.timeline.reduce((sum, point) => sum + point.failures, 0) /
    Math.max(metrics.timeline.reduce((sum, point) => sum + point.deployments, 0), 1);
  const access = metrics.accessInsights;
  const topCountries = access.topCountries.slice(0, 5);
  const topCities = access.topCities.slice(0, 5);
  const browserShare = access.browserShare.slice(0, 5);
  const osShare = access.osShare.slice(0, 5);
  const countryItems = topCountries.map(({ country, count, percent }) => ({
    label: country,
    count,
    percent,
  }));
  const cityItems = topCities.map(({ label, count, percent }) => ({
    label,
    count,
    percent,
  }));
  const browserItems = browserShare.map(({ label, count, percent }) => ({
    label,
    count,
    percent,
  }));
  const osItems = osShare.map(({ label, count, percent }) => ({
    label,
    count,
    percent,
  }));
  const humanDeviceTotal = access.deviceSplit.humanTotal;
  const botShare = access.totalLogins > 0 ? (access.botCount / access.totalLogins) * 100 : 0;

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-12 px-6 pb-20 pt-16">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge className="bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
            Internal · Real-time
          </Badge>
          <h1 className="text-3xl font-semibold text-foreground">
            Platform Intelligence Console
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Observe how the hosting network evolves in real time. Monitor growth, spot anomalies,
            and keep the zero-cost edge sharp for the research collectives relying on Noesis.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary hover:text-primary/90"
          >
            Back to control centre
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <LogoutButton />
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between text-base font-medium text-foreground">
              Active footprint
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Sites currently live across the edge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold text-foreground">{formatNumber(metrics.overview.activeSites)}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.overview.totalSites)} total · {activeRatio}% active ·{" "}
              {formatNumber(metrics.overview.pausedSites)} paused · {formatNumber(metrics.overview.runtimeMix.SPA)} SPA · {formatNumber(metrics.overview.runtimeMix.PHP)} PHP · {formatNumber(metrics.overview.runtimeMix.STATIC)} static
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between text-base font-medium text-foreground">
              Deployment velocity
              <Activity className="h-4 w-4 text-blue-300" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Successful pushes over the last seven days.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold text-foreground">
              {formatNumber(metrics.overview.deploymentsLast7)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.overview.totalDeployments)} lifetime · {formatNumber(metrics.overview.deploymentsLast24h)} in the last 24h
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between text-base font-medium text-foreground">
              Storage footprint
              <Database className="h-4 w-4 text-violet-300" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Compressed artefacts stored across all teams.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold text-foreground">{storageReadable}</div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.overview.totalDomains)} domains on record · {formatNumber(metrics.overview.proxiedCount)} proxied via Cloudflare
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/30">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between text-base font-medium text-foreground">
              Risk &amp; incidents
              <ShieldAlert className="h-4 w-4 text-amber-300" />
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Flags requiring ops attention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold text-foreground">
              {formatNumber(metrics.overview.highRiskSites + metrics.overview.highRiskUsers)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(metrics.overview.highRiskSites)} sites · {formatNumber(metrics.overview.highRiskUsers)} accounts · {metrics.overview.dnsIssues} DNS pending
              <br />{formatNumber(metrics.overview.securityAlerts)} runtime alerts · {formatNumber(metrics.overview.securityFailures)} quarantined
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/40 bg-card/80 shadow-lg shadow-black/20">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
          <CardTitle className="text-lg font-semibold text-foreground">Activity timeline</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Deployments, registrations, and failed pushes across the last 14 days.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-100">
            Failure rate {(failureRate * 100).toFixed(1)}%
          </Badge>
        </CardHeader>
      <CardContent>
        <Sparkline data={metrics.timeline} />
      </CardContent>
    </Card>

      <section className="grid gap-8 xl:grid-cols-3">
        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Access telemetry
                <PieChart className="h-4 w-4 text-emerald-300" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Successful platform logins observed over the last {access.windowDays}-day window.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-100">
              {formatNumber(access.logins24h)} / 24h
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 rounded-lg border border-border/20 bg-card/70 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Total logins</p>
                <p className="text-2xl font-semibold text-foreground">{formatNumber(access.totalLogins)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(access.logins7d)} in the last 7 days
                </p>
              </div>
              <div className="space-y-1 rounded-lg border border-border/20 bg-card/70 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Unique accounts</p>
                <p className="text-2xl font-semibold text-foreground">{formatNumber(access.uniqueUsers)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(access.uniqueIps)} unique IPs observed
                </p>
              </div>
              <div className="space-y-1 rounded-lg border border-border/20 bg-card/70 p-3">
                <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">24h throughput</p>
                <p className="text-2xl font-semibold text-foreground">{formatNumber(access.logins24h)}</p>
                <p className="text-xs text-muted-foreground">{access.windowDays}-day observation window</p>
              </div>
            </div>
            {access.botCount > 0 ? (
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-[0.7rem] text-amber-100">
                {formatNumber(access.botCount)} sessions flagged as automated (~{botShare.toFixed(1)}%). Review WAF and
                rate-limiting if the trend accelerates.
              </div>
            ) : (
              <p className="text-[0.7rem] text-muted-foreground">
                No automated login traffic detected within this window.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Geographic footprint
                <Globe2 className="h-4 w-4 text-sky-300" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Primary origins for authenticated traffic across the edge.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-sky-400/40 bg-sky-500/10 text-sky-100">
              {formatNumber(access.totalLogins)} events
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Top countries</h4>
              <div className="mt-3">
                <RankedList
                  items={countryItems}
                  gradient="from-emerald-400/80 via-emerald-400/60 to-emerald-500/60"
                  emptyLabel="No geographic signals recorded yet."
                />
              </div>
            </div>
            <div>
              <h4 className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Top metro areas</h4>
              <div className="mt-3">
                <RankedList
                  items={cityItems}
                  gradient="from-sky-400/80 via-sky-400/60 to-blue-500/60"
                  emptyLabel="City-level analytics will appear once sufficient traffic arrives."
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Client mix
                <MonitorSmartphone className="h-4 w-4 text-purple-300" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Device posture, browsers, and operating systems seen in the window.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Human devices</h4>
              {humanDeviceTotal > 0 ? (
                <div className="mt-3 space-y-3">
                  <DeviceMeter
                    label="Desktop"
                    value={access.deviceSplit.desktop}
                    total={humanDeviceTotal}
                    gradient="from-sky-400/80 via-sky-400/60 to-blue-500/60"
                  />
                  <DeviceMeter
                    label="Mobile / tablet"
                    value={access.deviceSplit.mobile}
                    total={humanDeviceTotal}
                    gradient="from-violet-400/80 via-violet-400/60 to-indigo-500/60"
                  />
                  <DeviceMeter
                    label="Unknown agents"
                    value={access.deviceSplit.unknown}
                    total={humanDeviceTotal}
                    gradient="from-slate-400/70 via-slate-400/50 to-slate-500/50"
                  />
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  No verified human sessions recorded in the current observation window.
                </p>
              )}
            </div>
            <Separator className="border-border/30" />
            <div>
              <h4 className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">Browser share</h4>
              <div className="mt-3">
                <RankedList
                  items={browserItems}
                  gradient="from-blue-400/80 via-blue-400/60 to-indigo-500/60"
                  emptyLabel="Browser telemetry is not yet available."
                />
              </div>
            </div>
            <Separator className="border-border/30" />
            <div>
              <h4 className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">OS footprint</h4>
              <div className="mt-3">
                <RankedList
                  items={osItems}
                  gradient="from-purple-400/80 via-purple-400/60 to-fuchsia-500/60"
                  emptyLabel="OS level telemetry is not yet available."
                />
              </div>
            </div>
            <Separator className="border-border/30" />
            <div className="text-xs text-muted-foreground">
              {access.botCount > 0 ? (
                <span>
                  {formatNumber(access.botCount)} sessions ({botShare.toFixed(1)}%) matched automation signatures.
                </span>
              ) : (
                <span>No automated clients detected in this period.</span>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Top performing sites</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Ranked by lifetime deployments with domain health indicators.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Site</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Owner</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Deployments</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Runtime</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Domain</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Security</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topSites.map((site) => (
                  <TableRow key={site.siteId} className="border-border/20">
                    <TableCell className="text-sm text-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{site.name}</span>
                        <span className="text-xs text-muted-foreground">/{site.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{site.ownerEmail}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumber(site.totalDeployments)}{" "}
                      <span className="text-[0.65rem] text-muted-foreground/80">
                        ({formatNumber(site.successfulDeployments)} ok · {formatNumber(site.failedDeployments)} err)
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-2 py-[3px] text-[0.65rem] uppercase tracking-[0.25em]",
                          (RUNTIME_BADGES[site.runtime ?? "UNKNOWN"] ?? RUNTIME_BADGES.UNKNOWN).className,
                        )}
                      >
                        {(RUNTIME_BADGES[site.runtime ?? "UNKNOWN"] ?? RUNTIME_BADGES.UNKNOWN).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {site.primaryDomain ?? "—"}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border text-[0.65rem]",
                            site.dnsVerified ? "border-emerald-400/40 text-emerald-100" : "border-amber-400/40 text-amber-100",
                          )}
                        >
                          {site.dnsVerified ? "DNS verified" : "Pending DNS"}
                        </Badge>
                        {site.proxiedThroughCloudflare && (
                          <Badge variant="outline" className="border-blue-400/40 text-[0.65rem] text-blue-100">
                            Proxied
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border px-2 py-[3px] text-[0.65rem] uppercase tracking-[0.25em]",
                            (SECURITY_BADGES[site.securityProfile?.lastScanStatus ?? "UNKNOWN"] ?? SECURITY_BADGES.UNKNOWN).className,
                          )}
                        >
                          {(SECURITY_BADGES[site.securityProfile?.lastScanStatus ?? "UNKNOWN"] ?? SECURITY_BADGES.UNKNOWN).label}
                        </Badge>
                        <span className="text-[0.65rem] text-muted-foreground/80">
                          {formatDateTime(site.securityProfile?.lastScanAt ?? null)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <RiskBadge score={site.riskScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Accounts under watch</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Elevated risk scores based on behavioural analytics and login patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Account</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Sites</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Deployments</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Signals</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.highRiskUsers.map((user) => (
                  <TableRow key={user.userId} className="border-border/20">
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.email}</span>
                        {user.fullName && <span className="text-[0.65rem] text-muted-foreground">{user.fullName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumber(user.totalSites)} total
                      <div className="text-[0.65rem] text-muted-foreground/80">
                        {formatNumber(user.activeSites)} active · {formatNumber(user.pausedSites)} paused
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumber(user.totalDeployments)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.failedLoginAttempts > 0 && (
                        <Badge variant="outline" className="mr-1 border-red-400/40 text-[0.65rem] text-red-100">
                          {formatNumber(user.failedLoginAttempts)} failed logins
                        </Badge>
                      )}
                      {user.riskReasons.slice(0, 2).map((reason) => (
                        <Badge key={reason} variant="outline" className="mr-1 mt-1 border-amber-400/40 text-[0.65rem] text-amber-100">
                          {reason}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <RiskBadge score={user.riskScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {metrics.highRiskUsers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No accounts breach the risk threshold right now. Continue monitoring login anomalies and abuse reports.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 xl:grid-cols-3">
        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Recent deployments</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Chronological log of the latest artefacts pushed to the edge.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-100">
              {formatNumber(metrics.recentDeployments.length)} records
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Site</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Runtime</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Owner</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentDeployments.map((deployment) => (
                  <TableRow key={deployment.id} className="border-border/20">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(deployment.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{deployment.siteName}</span>
                        <span className="text-[0.65rem] text-muted-foreground/70">/{deployment.siteSlug}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border text-[0.65rem]",
                          deployment.status === "ACTIVE"
                            ? "border-emerald-400/40 text-emerald-100"
                            : deployment.status === "FAILED"
                              ? "border-red-400/50 text-red-100"
                              : "border-slate-400/30 text-muted-foreground",
                        )}
                      >
                        {deployment.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border px-2 py-[3px] text-[0.65rem] uppercase tracking-[0.25em]",
                          (RUNTIME_BADGES[deployment.runtime ?? "UNKNOWN"] ?? RUNTIME_BADGES.UNKNOWN).className,
                        )}
                      >
                        {(RUNTIME_BADGES[deployment.runtime ?? "UNKNOWN"] ?? RUNTIME_BADGES.UNKNOWN).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{deployment.ownerEmail}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {deployment.notes ? deployment.notes : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Incident log</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Failed deployments and domain verification errors that need triage.
              </CardDescription>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-300" />
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3 text-xs text-muted-foreground">
              {metrics.incidentEvents.map((incident) => (
                <li key={incident.id} className="rounded-lg border border-border/30 bg-gradient-to-br from-card/40 to-card/10 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{incident.eventType.replace(/_/g, " ").toLowerCase()}</span>
                    <span className="text-[0.65rem] text-muted-foreground/80">
                      {new Date(incident.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground/90">
                    {incident.siteName && <span>Site: {incident.siteName}</span>}
                    {incident.userEmail && <span>Owner: {incident.userEmail}</span>}
                  </div>
                  {incident.metadata && (
                    <pre className="mt-2 max-h-24 overflow-hidden rounded bg-muted/20 px-2 py-1 text-[0.6rem] text-muted-foreground">
                      {JSON.stringify(incident.metadata, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
            {metrics.incidentEvents.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No active incidents right now. Keep monitoring automated TLS issuance, antivirus scans, and DNS propagation alerts.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/40 bg-card/80 shadow-sm shadow-black/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Latest registrations
                <Users className="h-4 w-4 text-blue-300" />
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                New creators joining the experimental hosting programme.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-blue-400/40 bg-blue-500/10 text-blue-100">
              +{formatNumber(metrics.overview.newUsersLast7)} in the last 7 days
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-xs text-muted-foreground">Account</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Created</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Sites</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Deployments</TableHead>
                  <TableHead className="text-xs text-muted-foreground">Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentUsers.map((user) => (
                  <TableRow key={user.id} className="border-border/20">
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{user.email}</span>
                        {user.fullName && <span className="text-[0.65rem] text-muted-foreground">{user.fullName}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatNumber(user.totalSites)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatNumber(user.totalDeployments)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <RiskBadge score={user.riskScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Noesis AI — Internal operations console</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Notice
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Use
          </Link>
        </div>
      </footer>
    </main>
  );
}
