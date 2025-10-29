"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type DashboardSite = {
  id: string;
  name: string;
  slug: string;
  status: string;
  maxUploadSize: number;
  lastDeploymentAt: string | null;
  createdAt: string;
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
  sites: DashboardSite[];
};

export function DashboardClient({ user, freeDomainSuffix, sites }: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

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
                        <span className="rounded-full border border-outline/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted">
                          {site.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        Primary domain: <span className="text-foreground">{primary}</span> · Sandbox: {sandbox}
                      </p>
                      <p className="text-xs text-muted/70">
                        Last deployment: {site.lastDeploymentAt ? new Date(site.lastDeploymentAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="text-xs text-muted">
                      Created {new Date(site.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-3">
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
                        freeSuffix={freeDomainSuffix}
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
                  </div>

                  {site.deployments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">Recent deployments</h4>
                      <ul className="mt-3 space-y-2 text-xs text-muted">
                        {site.deployments.slice(0, 5).map((deployment) => (
                          <li key={deployment.id} className="flex items-center justify-between rounded-xl border border-outline/40 bg-card/50 px-4 py-2">
                            <span>
                              {deployment.status} · {new Date(deployment.createdAt).toLocaleString()}
                              {deployment.notes ? ` — ${deployment.notes}` : ""}
                            </span>
                          </li>
                        ))}
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
  freeSuffix: string;
  existingRequests: DashboardSite["purchaseRequests"];
  onSubmit: (hostname: string) => Promise<void>;
  onRequestPurchase: (payload: { domain: string; tlds: string[]; budget?: number }) => Promise<void>;
};

function DomainForm({ current, freeSuffix, onSubmit, onRequestPurchase, existingRequests }: DomainFormProps) {
  const [value, setValue] = useState(current);
  const [requestDomain, setRequestDomain] = useState("");
  const [tlds, setTlds] = useState(".com,.ai");
  const [budget, setBudget] = useState("200");

  return (
    <div className="space-y-4">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(value.trim());
        }}
        className="space-y-3"
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-2xl border border-outline/60 bg-card/60 px-4 py-2 text-xs text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="w-full rounded-full border border-outline/60 px-4 py-2 text-xs font-semibold text-foreground transition hover:border-accent"
        >
          Save primary domain
        </button>
      </form>
      <div className="rounded-2xl border border-outline/50 bg-card/40 px-4 py-3 text-xs text-muted">
        Free sandbox subdomains are provisioned under <strong>.{freeSuffix}</strong>. Keep at least one sandbox active for staging.
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
