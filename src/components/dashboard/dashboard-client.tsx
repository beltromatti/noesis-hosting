"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DnsCheckResult } from "@/lib/dns";

export type DashboardSite = {
  id: string;
  name: string;
  slug: string;
  status: string;
  maxUploadSize: number;
  lastDeploymentAt: string | null;
  createdAt: string;
  hasArchive: boolean;
  securityConfig: {
    forceHttps?: boolean;
    autoIndexing?: boolean;
    accessLogging?: boolean;
    basicAuth?: boolean;
    firewall?: {
      enabled?: boolean;
      geoBlock?: string[];
    };
  } | null;
  domains: Array<{
    id: string;
    hostname: string;
    isPrimary: boolean;
    verificationStatus: string;
    type: string;
    createdAt: string;
    dns: (DnsCheckResult & { checkedAt?: string }) | null;
  }>;
  deployments: Array<{
    id: string;
    status: string;
    createdAt: string;
    notes?: string | null;
  }>;
  purchaseRequests: Array<{
    id: string;
    domain: string;
    status: string;
    tlds: string[];
    createdAt: string;
  }>;
};

export type DashboardClientProps = {
  user: {
    email: string;
    fullName: string | null;
  };
  freeDomainSuffix: string;
  edgeIp: string;
  sites: DashboardSite[];
};

export function DashboardClient({ user, freeDomainSuffix, edgeIp, sites }: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [siteMessage, setSiteMessage] = useState<string | null>(null);

  const handleCreateSite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    const form = new FormData(event.currentTarget);
    const name = form.get("name");
    const customDomain = (form.get("customDomain") as string) || undefined;
    const requestPurchase = form.get("requestDomainPurchase") === "on";

    try {
      const response = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, customDomain, requestDomainPurchase: requestPurchase }),
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to create site");
      }
      (event.currentTarget as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } catch (error) {
      setCreateError((error as Error).message);
    }
  };

  const handleUpload = async (siteId: string, file: File | null, notes?: string) => {
    if (!file) {
      setUploadMessage("Please choose a .zip archive to deploy.");
      return;
    }
    setUploadMessage(null);
    const formData = new FormData();
    formData.append("archive", file);
    if (notes) {
      formData.append("notes", notes);
    }

    const response = await fetch(`/api/sites/${siteId}/deploy`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setUploadMessage(payload.error ?? "Deployment failed. Check archive validity.");
      return;
    }

    startTransition(() => router.refresh());
    setUploadMessage("Deployment triggered successfully.");
  };

  const handleDomainChange = async (siteId: string, hostname: string) => {
    setDomainMessage(null);
    const response = await fetch(`/api/sites/${siteId}/domain`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setDomainMessage(payload.error ?? "Unable to update domain");
      return;
    }
    startTransition(() => router.refresh());
    setDomainMessage("Domain preferences saved. Propagation may take a few minutes.");
  };

  const handleSecurityToggle = async (siteId: string, payload: Record<string, unknown>) => {
    setDomainMessage(null);
    const response = await fetch(`/api/sites/${siteId}/security`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setDomainMessage(body.error ?? "Unable to update security settings");
      return;
    }
    startTransition(() => router.refresh());
  };

  const handleDomainPurchase = async (siteId: string, domain: string, tlds: string[], budget?: number) => {
    const response = await fetch("/api/domains/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId, domain, tlds, budgetUsd: budget }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setDomainMessage(body.error ?? "Domain purchase request failed");
      return;
    }
    setDomainMessage("Domain purchase request submitted. We will follow up via email.");
    startTransition(() => router.refresh());
  };

  const handlePause = async (siteId: string) => {
    setSiteMessage(null);
    const response = await fetch(`/api/sites/${siteId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setSiteMessage(payload.error ?? "Unable to pause the site");
      return;
    }
    setSiteMessage("Site paused successfully.");
    startTransition(() => router.refresh());
  };

  const handleResume = async (siteId: string) => {
    setSiteMessage(null);
    const response = await fetch(`/api/sites/${siteId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resume" }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setSiteMessage(payload.error ?? "Unable to resume the site");
      return;
    }
    setSiteMessage("Site is live again.");
    startTransition(() => router.refresh());
  };

  const handleDelete = async (siteId: string, siteName: string) => {
    if (!window.confirm(`Delete ${siteName}? This action cannot be undone.`)) {
      return;
    }
    setSiteMessage(null);
    const response = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setSiteMessage(payload.error ?? "Unable to delete the site");
      return;
    }
    setSiteMessage("Site removed. DNS propagation may take a minute.");
    startTransition(() => router.refresh());
  };

  const handleDownload = (siteId: string) => {
    window.location.href = `/api/sites/${siteId}/archive`;
  };

  const primaryDomain = (site: DashboardSite) =>
    site.domains.find((domain) => domain.isPrimary)?.hostname ?? `${site.slug}.${freeDomainSuffix}`;

  const freeSandbox = (site: DashboardSite) =>
    site.domains.find((domain) => domain.type === "FREE_SUBDOMAIN")?.hostname ?? `${site.slug}.${freeDomainSuffix}`;

  const siteSecurity = (site: DashboardSite) => ({
    forceHttps: site.securityConfig?.forceHttps ?? true,
    autoIndexing: site.securityConfig?.autoIndexing ?? true,
    accessLogging: site.securityConfig?.accessLogging ?? true,
    basicAuth: site.securityConfig?.basicAuth ?? false,
    firewall: {
      enabled: site.securityConfig?.firewall?.enabled ?? true,
    },
  });

  const formatSiteStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { label: "Live", tone: "border border-outline/60 text-accent" };
      case "DISABLED":
        return { label: "Paused", tone: "border border-danger/40 text-danger" };
      case "FAILED":
        return { label: "Failed", tone: "border border-danger/40 text-danger" };
      case "PENDING":
        return { label: "Pending", tone: "border border-outline/60 text-muted" };
      default:
        return { label: status, tone: "border border-outline/60 text-muted" };
    }
  };

  const formatDeploymentStatus = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return { label: "Live", tone: "text-accent" };
      case "ROLLED_BACK":
        return { label: "Previous", tone: "text-muted" };
      case "FAILED":
        return { label: "Failed", tone: "text-danger" };
      case "DEPLOYING":
        return { label: "Deploying", tone: "text-accent" };
      case "PENDING":
        return { label: "Pending", tone: "text-muted" };
      default:
        return { label: status, tone: "text-muted" };
    }
  };

  return (
    <div className="space-y-12">
      <section className="glass-panel glow-border p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="tag">Workspace</span>
            <h1 className="mt-4 text-3xl font-semibold">Welcome, {user.fullName ?? user.email}</h1>
            <p className="max-w-2xl text-sm text-muted">
              Upload compressed static builds, assign domains, and manage security policies. Everything runs on the
              same hardened stack that powers the Noesis translator.
            </p>
          </div>
          <div className="text-xs text-muted">
            Upload limit {Math.round((sites[0]?.maxUploadSize ?? 157286400) / (1024 * 1024))} MB · Free sandbox: *.{freeDomainSuffix}
          </div>
        </div>
      </section>

      <section className="glass-panel glow-border p-8">
        <h2 className="text-2xl font-semibold">Create a new site</h2>
        <p className="mt-2 text-sm text-muted">
          Each site is isolated with its own nginx config and security profile. You can attach multiple domains later.
        </p>
        <form onSubmit={handleCreateSite} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Site name
            </label>
            <input
              id="name"
              name="name"
              required
              placeholder="Research portal"
              className="w-full rounded-2xl border border-outline/60 bg-card/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="customDomain">
              Custom domain (optional)
            </label>
            <input
              id="customDomain"
              name="customDomain"
              placeholder="lab.example.org"
              className="w-full rounded-2xl border border-outline/60 bg-card/70 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-muted md:col-span-2">
            <input
              type="checkbox"
              name="requestDomainPurchase"
              className="h-4 w-4 rounded border-outline/60 bg-card"
            />
            I would like Noesis AI to purchase and configure a new domain for me (coming soon).
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:-translate-y-0.5"
              disabled={isPending}
            >
              {isPending ? "Creating…" : "Create site"}
            </button>
            {createError && <span className="text-sm text-danger">{createError}</span>}
          </div>
        </form>
      </section>

      {domainMessage && (
        <div className="rounded-2xl border border-outline/60 bg-card/60 px-5 py-3 text-sm text-muted">
          {domainMessage}
        </div>
      )}
      {uploadMessage && (
        <div className="rounded-2xl border border-outline/60 bg-card/60 px-5 py-3 text-sm text-muted">
          {uploadMessage}
        </div>
      )}
      {siteMessage && (
        <div className="rounded-2xl border border-outline/60 bg-card/60 px-5 py-3 text-sm text-muted">
          {siteMessage}
        </div>
      )}

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Your hosted sites</h2>
        {sites.length === 0 ? (
          <p className="text-sm text-muted">No sites yet. Create one above to get started.</p>
        ) : (
          <div className="grid gap-8">
            {sites.map((site) => {
              const security = siteSecurity(site);
              const primary = primaryDomain(site);
              const sandbox = freeSandbox(site);
              return (
                <div key={site.id} className="glass-panel glow-border space-y-6 p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-foreground">{site.name}</h3>
                        {(() => {
                          const { label, tone } = formatSiteStatus(site.status);
                          return (
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${tone}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Primary domain: <span className="text-foreground">{primary}</span> · Sandbox: {sandbox}
                      </p>
                      {site.status === "DISABLED" && (
                        <p className="text-xs text-danger/80">Site is paused. Visitors receive a 503 maintenance response.</p>
                      )}
                      <p className="text-xs text-muted/70">
                        Last deployment: {site.lastDeploymentAt ? new Date(site.lastDeploymentAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="text-xs text-muted text-right">
                      <p>Created {new Date(site.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-4">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Deploy new version</h4>
                      <p className="text-xs text-muted">
                        Upload a .zip archive containing your static build. Maximum size {Math.round(site.maxUploadSize / (1024 * 1024))} MB.
                      </p>
                      <DeployForm onDeploy={handleUpload} siteId={site.id} />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Domains</h4>
                      <p className="text-xs text-muted">
                        Update the primary hostname once DNS points to the Noesis edge. We auto-provision nginx on save.
                      </p>
                      <DomainForm
                        current={primary}
                        edgeIp={edgeIp}
                        freeSuffix={freeDomainSuffix}
                        domains={site.domains}
                        onSubmit={(hostname) => handleDomainChange(site.id, hostname)}
                        onRequestPurchase={(payload) =>
                          handleDomainPurchase(site.id, payload.domain, payload.tlds, payload.budget)
                        }
                        existingRequests={site.purchaseRequests}
                      />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Security presets</h4>
                      <p className="text-xs text-muted">Toggle runtime safeguards for this site.</p>
                      <SecurityForm
                        siteId={site.id}
                        settings={security}
                        onChange={handleSecurityToggle}
                      />
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">Current build & controls</h4>
                      <p className="text-xs text-muted">
                        Download the latest deployed build, pause traffic, or remove the site entirely.
                      </p>
                      <div className="flex flex-col gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleDownload(site.id)}
                          disabled={!site.hasArchive}
                          className="rounded-full border border-outline/60 px-4 py-2 font-semibold text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Download current build
                        </button>
                        {site.status === "DISABLED" ? (
                          <button
                            type="button"
                            onClick={() => handleResume(site.id)}
                            className="rounded-full border border-outline/60 px-4 py-2 font-semibold text-foreground transition hover:border-accent"
                          >
                            Resume site
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePause(site.id)}
                            className="rounded-full border border-outline/60 px-4 py-2 font-semibold text-foreground transition hover:border-accent"
                          >
                            Pause site
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(site.id, site.name)}
                          className="rounded-full border border-danger/40 px-4 py-2 font-semibold text-danger transition hover:border-danger"
                        >
                          Delete site
                        </button>
                      </div>
                    </div>
                  </div>

                  {site.deployments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Recent deployments</h4>
                      <ul className="mt-3 space-y-2 text-xs text-muted">
                        {site.deployments
                          .slice(0, 5)
                          .map((deployment) => {
                            const { label, tone } = formatDeploymentStatus(deployment.status);
                            return (
                              <li
                                key={deployment.id}
                                className="flex items-center justify-between rounded-xl border border-outline/40 bg-card/50 px-4 py-2"
                              >
                                <span>
                                  <span className={`mr-2 font-semibold ${tone}`}>{label}</span>
                                  {new Date(deployment.createdAt).toLocaleString()}
                                  {deployment.notes ? ` — ${deployment.notes}` : ""}
                                </span>
                              </li>
                            );
                          })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

type DeployFormProps = {
  siteId: string;
  onDeploy: (siteId: string, file: File | null, notes?: string) => Promise<void>;
};

function DeployForm({ siteId, onDeploy }: DeployFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploading(true);
    await onDeploy(siteId, file, note);
    setUploading(false);
    setFile(null);
    setNote("");
    (event.currentTarget as HTMLFormElement).reset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="file"
        accept=".zip"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="w-full rounded-2xl border border-outline/60 bg-card/50 px-4 py-2 text-xs text-muted file:mr-4 file:rounded-full file:border-0 file:bg-accent file:px-4 file:py-2 file:text-xs file:font-medium file:text-background"
      />
      <input
        type="text"
        placeholder="Deployment notes (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={uploading || !file}
        className="w-full rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? "Deploying…" : "Deploy"}
      </button>
    </form>
  );
}

type DomainFormProps = {
  current: string;
  edgeIp: string;
  freeSuffix: string;
  domains: DashboardSite["domains"];
  existingRequests: DashboardSite["purchaseRequests"];
  onSubmit: (hostname: string) => Promise<void>;
  onRequestPurchase: (payload: { domain: string; tlds: string[]; budget?: number }) => Promise<void>;
};

const formatDnsStatus = (result?: DnsCheckResult | null) => {
  if (!result) return "Pending check";
  switch (result.status) {
    case "MATCH":
      return "✅ Points to Noesis edge";
    case "PROXIED":
      return "✅ Proxied via Cloudflare";
    case "MISMATCH":
      return "⚠️ DNS active but not pointing to Noesis";
    default:
      return "⏳ DNS not resolved yet";
  }
};

function DomainForm({
  current,
  edgeIp,
  freeSuffix,
  domains,
  existingRequests,
  onSubmit,
  onRequestPurchase,
}: DomainFormProps) {
  const [value, setValue] = useState(current);
  const [requestDomain, setRequestDomain] = useState("");
  const [tlds, setTlds] = useState(".com,.ai");
  const [budget, setBudget] = useState("200");

  useEffect(() => setValue(current), [current]);

  const primaryDomainEntry = useMemo(
    () => domains.find((domain) => domain.hostname === current),
    [domains, current],
  );

  const initialStatus = primaryDomainEntry?.dns ?? null;
  const [primaryStatus, setPrimaryStatus] = useState<DnsCheckResult | null>(initialStatus);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    setPrimaryStatus(initialStatus);
  }, [initialStatus]);

  const fetchDnsStatus = useCallback(async () => {
    if (!current) return;
    setIsChecking(true);
    try {
      const response = await fetch(`/api/domains/status?hostname=${encodeURIComponent(current)}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to check DNS");
      }
      setPrimaryStatus(data.result);
      setStatusError(null);
    } catch (error) {
      setStatusError((error as Error).message);
    } finally {
      setIsChecking(false);
    }
  }, [current]);

  useEffect(() => {
    fetchDnsStatus();
    const interval = setInterval(fetchDnsStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchDnsStatus]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const hostname = value.trim();
          if (!hostname) return;
          await onSubmit(hostname);
        }}
        className="space-y-3"
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
        />
        <p className="text-[11px] text-muted">
          Reserved namespace <code className="rounded bg-card/80 px-1 py-0.5 text-foreground">*.{freeSuffix}</code> is managed automatically and cannot be reassigned.
        </p>
        <button
          type="submit"
          className="w-full rounded-full border border-outline/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent"
        >
          Save primary domain
        </button>
      </form>

      <div className="rounded-2xl border border-outline/60 bg-card/50 px-4 py-3 text-xs text-muted">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-foreground">
            DNS status for <span className="text-foreground/80">{current}</span>
          </span>
          <button
            type="button"
            onClick={fetchDnsStatus}
            disabled={isChecking}
            className="rounded-full border border-outline/60 px-3 py-1 text-[11px] text-foreground transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isChecking ? "Checking…" : "Check now"}
          </button>
        </div>
        <p className="mt-2 text-[11px]">{formatDnsStatus(primaryStatus)}</p>
        <p className="text-[11px] text-muted/80">
          {primaryStatus?.status === "PROXIED" ? (
            <>
              Cloudflare proxy detected (orange-cloud). Current responses come from Cloudflare edges; this is
              healthy. Keep the origin A record pointing to{" "}
              <code className="rounded bg-card/80 px-1 py-0.5 text-foreground">{edgeIp}</code>.
            </>
          ) : (
            <>
              Point the domain A record to{" "}
              <code className="rounded bg-card/80 px-1 py-0.5 text-foreground">{edgeIp}</code>. We re-check every 60
              seconds.
            </>
          )}
        </p>
        {primaryStatus?.records?.length ? (
          <p className="text-[11px] text-muted">
            {primaryStatus.status === "PROXIED" ? "Cloudflare edge IPs" : "Current A records"}: {primaryStatus.records.join(", ")}
          </p>
        ) : (
          <p className="text-[11px] text-muted">No A records detected yet.</p>
        )}
        {statusError && <p className="mt-2 text-[11px] text-danger">{statusError}</p>}
      </div>

      <div className="rounded-2xl border border-outline/50 bg-card/40 px-4 py-3 text-xs text-muted">
        <p className="text-xs font-semibold text-foreground">Tracked domains</p>
        <div className="mt-2 space-y-2">
          {domains.map((domain) => (
            <div key={domain.id} className="flex items-center justify-between gap-3">
              <span className="text-foreground/80">
                {domain.hostname}
                {domain.isPrimary ? " · primary" : ""}
              </span>
              <span className="text-[11px]">{formatDnsStatus(domain.dns)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Free sandbox subdomains remain available under <strong>.{freeSuffix}</strong>.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">Request a domain purchase (beta)</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await onRequestPurchase({
              domain: requestDomain.trim(),
              tlds: tlds
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              budget: Number(budget) || undefined,
            });
            setRequestDomain("");
          }}
          className="space-y-2"
        >
          <input
            value={requestDomain}
            onChange={(event) => setRequestDomain(event.target.value)}
            placeholder="preferred-name"
            className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
          />
          <input
            value={tlds}
            onChange={(event) => setTlds(event.target.value)}
            placeholder=".com,.ai,.research"
            className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
          />
          <input
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            type="number"
            min="50"
            step="10"
            className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
            placeholder="Budget (USD)"
          />
          <button
            type="submit"
            className="w-full rounded-full border border-outline/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent"
          >
            Submit request
          </button>
        </form>
        {existingRequests.length > 0 && (
          <div className="space-y-1 text-xs text-muted">
            <p className="font-medium text-foreground">Requests</p>
            {existingRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-outline/40 bg-card/40 px-3 py-2">
                {request.domain} ({request.tlds.join(", ")}) — {request.status}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type SecurityFormProps = {
  siteId: string;
  settings: {
    forceHttps: boolean;
    autoIndexing: boolean;
    accessLogging: boolean;
    basicAuth: boolean;
    firewall: { enabled: boolean };
  };
  onChange: (siteId: string, payload: Record<string, unknown>) => Promise<void>;
};

function SecurityForm({ siteId, settings, onChange }: SecurityFormProps) {
  const controls = useMemo(
    () => [
      {
        key: "forceHttps",
        label: "Enforce HTTPS redirects",
        checked: settings.forceHttps,
      },
      {
        key: "accessLogging",
        label: "Enable access logs",
        checked: settings.accessLogging,
      },
      {
        key: "autoIndexing",
        label: "Allow search engine indexing",
        checked: settings.autoIndexing,
      },
      {
        key: "firewall.enabled",
        label: "Edge firewall (bot & geo filters)",
        checked: settings.firewall.enabled,
      },
    ],
    [settings]
  );

  return (
    <div className="space-y-2">
      {controls.map((control) => {
        const [rootKey, nestedKey] = control.key.split(".");
        const checked = control.checked;
        return (
          <label key={control.key} className="flex items-center gap-3 text-xs text-muted">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                const payload = nestedKey
                  ? { [rootKey]: { [nestedKey]: event.target.checked } }
                  : { [rootKey]: event.target.checked };
                onChange(siteId, payload);
              }}
              className="h-4 w-4 rounded border-outline/60 bg-card"
            />
            {control.label}
          </label>
        );
      })}
      <p className="text-[10px] text-muted/70">
        Advanced options like HTTP auth credentials and geo-blocking lists will arrive soon.
      </p>
    </div>
  );
}
