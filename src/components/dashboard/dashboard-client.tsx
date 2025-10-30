"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Download,
  Globe,
  Pause,
  Play,
  Server,
  Shield,
  Trash2,
  UploadCloud,
} from "lucide-react";
import type { DnsCheckResult } from "@/lib/dns";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

type SiteNotice = {
  siteId: string;
  text: string;
  tone?: "default" | "success" | "error";
};

const STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  ACTIVE: { label: "Live", className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40" },
  DISABLED: { label: "Paused", className: "bg-amber-500/15 text-amber-200 border-amber-400/40" },
  FAILED: { label: "Failed", className: "bg-red-500/15 text-red-200 border-red-500/40" },
  PENDING: { label: "Pending", className: "bg-slate-500/15 text-slate-200 border-slate-400/40" },
};

const DNS_STATUS_MAP: Record<
  string,
  { label: string; className: string }
> = {
  MATCH: { label: "Points to edge", className: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40" },
  PROXIED: { label: "Proxied", className: "bg-blue-500/15 text-blue-200 border-blue-500/40" },
  MISMATCH: { label: "Mismatch", className: "bg-amber-500/15 text-amber-200 border-amber-500/40" },
  UNRESOLVED: { label: "Unresolved", className: "bg-slate-500/15 text-slate-200 border-slate-400/40" },
};

export function DashboardClient({ user, freeDomainSuffix, edgeIp, sites }: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [domainMessage, setDomainMessage] = useState<SiteNotice | null>(null);
  const [uploadMessage, setUploadMessage] = useState<SiteNotice | null>(null);
  const [siteMessage, setSiteMessage] = useState<SiteNotice | null>(null);

  const handleCreateSite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      formElement.reset();
      startTransition(() => router.refresh());
    } catch (error) {
      setCreateError((error as Error).message);
    }
  };

  const handleUpload = async (siteId: string, file: File | null, notes?: string) => {
    if (!file) {
      setUploadMessage({ siteId, text: "Please choose a .zip archive to deploy.", tone: "error" });
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
      setUploadMessage({
        siteId,
        text: payload.error ?? "Deployment failed. Check archive validity.",
        tone: "error",
      });
      return;
    }

    setUploadMessage({
      siteId,
      text: "Deployment triggered successfully.",
      tone: "success",
    });
    startTransition(() => router.refresh());
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
      setDomainMessage({
        siteId,
        text: payload.error ?? "Unable to update domain.",
        tone: "error",
      });
      return;
    }

    setDomainMessage({
      siteId,
      text: "Domain preferences saved. Propagation may take a few minutes.",
      tone: "success",
    });
    startTransition(() => router.refresh());
  };

  const handleSecurityToggle = async (siteId: string, payload: Record<string, unknown>) => {
    setSiteMessage(null);
    const response = await fetch(`/api/sites/${siteId}/security`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setSiteMessage({
        siteId,
        text: body.error ?? "Unable to update security settings.",
        tone: "error",
      });
      return;
    }

    setSiteMessage({
      siteId,
      text: "Security preferences updated.",
      tone: "success",
    });
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
      setDomainMessage({
        siteId,
        text: body.error ?? "Domain purchase request failed.",
        tone: "error",
      });
      return;
    }

    setDomainMessage({
      siteId,
      text: "Domain purchase request submitted. We will follow up via email.",
      tone: "success",
    });
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
      setSiteMessage({
        siteId,
        text: payload.error ?? "Unable to pause the site.",
        tone: "error",
      });
      return;
    }

    setSiteMessage({
      siteId,
      text: "Site paused successfully.",
      tone: "success",
    });
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
      setSiteMessage({
        siteId,
        text: payload.error ?? "Unable to resume the site.",
        tone: "error",
      });
      return;
    }

    setSiteMessage({
      siteId,
      text: "Site is live again.",
      tone: "success",
    });
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
      setSiteMessage({
        siteId,
        text: payload.error ?? "Unable to delete the site.",
        tone: "error",
      });
      return;
    }

    setSiteMessage({
      siteId,
      text: "Site removed. DNS propagation may take a minute.",
      tone: "success",
    });
    startTransition(() => router.refresh());
  };

  const handleDownload = (siteId: string) => {
    window.location.href = `/api/sites/${siteId}/archive`;
  };

  const hasSites = sites.length > 0;

  return (
    <TooltipProvider>
      <div className="space-y-10">
        <Card className="border-border/40 bg-card/70">
          <CardContent className="flex flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-lg font-medium text-foreground">
                {user.fullName ?? user.email}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground md:items-end">
              <span>Sandbox suffix: <span className="text-foreground">{freeDomainSuffix}</span></span>
              <span>Edge IP: <span className="text-foreground">{edgeIp}</span></span>
            </div>
          </CardContent>
        </Card>

        <Tabs
          defaultValue={hasSites ? "overview" : "create"}
          className="space-y-8"
        >
          <TabsList className="flex w-full justify-start gap-2 rounded-full bg-card/60 p-1">
            <TabsTrigger
              value="overview"
              className="rounded-full px-5 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              Sites overview
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="rounded-full px-5 py-2 text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground"
            >
              New site
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <CreateSiteCard
              onSubmit={handleCreateSite}
              freeDomainSuffix={freeDomainSuffix}
              createError={createError}
              isSubmitting={isPending}
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {hasSites ? (
              <Accordion type="single" collapsible className="space-y-4">
                {sites.map((site) => (
                  <SiteAccordionItem
                    key={site.id}
                    site={site}
                    edgeIp={edgeIp}
                    freeDomainSuffix={freeDomainSuffix}
                    messages={{
                      domain: domainMessage?.siteId === site.id ? domainMessage : null,
                      upload: uploadMessage?.siteId === site.id ? uploadMessage : null,
                      site: siteMessage?.siteId === site.id ? siteMessage : null,
                    }}
                    onUpload={handleUpload}
                    onDomainChange={handleDomainChange}
                    onDomainPurchase={handleDomainPurchase}
                    onSecurityToggle={handleSecurityToggle}
                    onPause={handlePause}
                    onResume={handleResume}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                  />
                ))}
              </Accordion>
            ) : (
              <Card className="border-border/40 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-2xl">No sites yet</CardTitle>
                  <CardDescription>
                    Create your first deployment to unlock the dashboard capabilities.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="lg"
                    className="rounded-full"
                    onClick={() => {
                      const trigger = document.querySelector<HTMLButtonElement>("[data-value='create']");
                      trigger?.click();
                    }}
                  >
                    Create a site
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

type CreateSiteCardProps = {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  freeDomainSuffix: string;
  createError: string | null;
  isSubmitting: boolean;
};

function CreateSiteCard({ onSubmit, freeDomainSuffix, createError, isSubmitting }: CreateSiteCardProps) {
  return (
    <Card className="border-border/40 bg-card/70">
      <CardHeader className="space-y-4">
        <CardTitle className="text-2xl">Provision a new site</CardTitle>
        <CardDescription>
          Each site receives an isolated nginx configuration, storage directory, and sandbox domain under{" "}
          <span className="text-foreground">*.{freeDomainSuffix}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {createError ? (
          <Alert variant="destructive" className="mb-6 border-danger/40 bg-danger/10 text-danger">
            <AlertDescription>{createError}</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Site name
              </Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Research portal"
                className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customDomain" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Custom domain (optional)
              </Label>
              <Input
                id="customDomain"
                name="customDomain"
                placeholder="lab.example.org"
                className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/50 p-4">
            <Checkbox id="requestDomainPurchase" name="requestDomainPurchase" />
            <Label
              htmlFor="requestDomainPurchase"
              className="text-sm text-muted-foreground"
            >
              I would like Noesis AI to purchase and configure a new domain for me (coming soon).
            </Label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Free sandbox URLs: <span className="text-foreground">*.{freeDomainSuffix}</span></p>
              <p>• Maximum archive size: 150 MB per deploy</p>
            </div>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="rounded-full px-8 text-sm font-semibold tracking-wide disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating…" : "Create site"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type SiteAccordionItemProps = {
  site: DashboardSite;
  edgeIp: string;
  freeDomainSuffix: string;
  messages: {
    domain: SiteNotice | null;
    upload: SiteNotice | null;
    site: SiteNotice | null;
  };
  onUpload: (siteId: string, file: File | null, notes?: string) => Promise<void>;
  onDomainChange: (siteId: string, hostname: string) => Promise<void>;
  onDomainPurchase: (siteId: string, domain: string, tlds: string[], budget?: number) => Promise<void>;
  onSecurityToggle: (siteId: string, payload: Record<string, unknown>) => Promise<void>;
  onPause: (siteId: string) => Promise<void>;
  onResume: (siteId: string) => Promise<void>;
  onDelete: (siteId: string, siteName: string) => Promise<void>;
  onDownload: (siteId: string) => void;
};

function SiteAccordionItem({
  site,
  edgeIp,
  freeDomainSuffix,
  messages,
  onUpload,
  onDomainChange,
  onDomainPurchase,
  onSecurityToggle,
  onPause,
  onResume,
  onDelete,
  onDownload,
}: SiteAccordionItemProps) {
  const primaryDomain = useMemo(
    () => site.domains.find((domain) => domain.isPrimary)?.hostname ?? `${site.slug}.${freeDomainSuffix}`,
    [site.domains, site.slug, freeDomainSuffix],
  );

  const sandboxDomain = useMemo(
    () => site.domains.find((domain) => domain.type === "FREE_SUBDOMAIN")?.hostname ?? `${site.slug}.${freeDomainSuffix}`,
    [site.domains, site.slug, freeDomainSuffix],
  );

  const statusStyle = STATUS_MAP[site.status] ?? STATUS_MAP.PENDING;

  return (
    <AccordionItem value={site.id} className="rounded-3xl border border-border/40 bg-card/70 px-2 py-1">
      <AccordionTrigger className="flex w-full items-start justify-between gap-4 rounded-2xl px-4 py-4 text-left hover:no-underline">
        <div className="space-y-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
            <span className="text-lg font-medium text-foreground">{site.name}</span>
            <Badge variant="outline" className={cn("border border-border/40 px-3 py-[5px] text-xs font-medium uppercase tracking-[0.3em]", statusStyle.className)}>
              {statusStyle.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Primary domain • <span className="text-foreground">{primaryDomain}</span>
          </p>
        </div>
        <div className="hidden text-right text-xs text-muted-foreground md:block">
          <p>Created {formatDateTime(site.createdAt)}</p>
          <p>Deployments {site.deployments.length}</p>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="w-full justify-start gap-2 overflow-x-auto rounded-full bg-card/60 p-1">
            <TabsTrigger value="overview" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="deploy" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              Deploy
            </TabsTrigger>
            <TabsTrigger value="domains" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              Domains
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              Security
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              History
            </TabsTrigger>
            <TabsTrigger value="controls" className="rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:bg-card data-[state=active]:text-foreground">
              Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="border-border/40 bg-card/60">
              <CardHeader className="space-y-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  Environment summary
                </CardTitle>
                <CardDescription>
                  Automatic sandbox domain provided at{" "}
                  <span className="text-foreground">{sandboxDomain}</span>. You can promote any verified domain to primary.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <InfoBlock label="Created" value={formatDateTime(site.createdAt)} />
                <InfoBlock
                  label="Last deployment"
                  value={site.lastDeploymentAt ? formatDateTime(site.lastDeploymentAt) : "Not deployed yet"}
                />
                <InfoBlock label="Slug" value={site.slug} />
                <InfoBlock label="Upload limit" value={`${Math.round(site.maxUploadSize / (1024 * 1024))} MB`} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deploy">
            <DeploySection
              site={site}
              message={messages.upload}
              onDeploy={onUpload}
            />
          </TabsContent>

          <TabsContent value="domains">
            <DomainSection
              site={site}
              edgeIp={edgeIp}
              primaryDomain={primaryDomain}
              sandboxDomain={sandboxDomain}
              message={messages.domain}
              onDomainChange={onDomainChange}
              onDomainPurchase={onDomainPurchase}
            />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySection
              site={site}
              onSecurityToggle={onSecurityToggle}
              message={messages.site}
            />
          </TabsContent>

          <TabsContent value="history">
            <DeploymentTable deployments={site.deployments} />
          </TabsContent>

          <TabsContent value="controls">
            <ControlsSection
              site={site}
              message={messages.site}
              onPause={onPause}
              onResume={onResume}
              onDelete={onDelete}
              onDownload={onDownload}
            />
          </TabsContent>
        </Tabs>
      </AccordionContent>
    </AccordionItem>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-foreground">{value}</p>
    </div>
  );
}

type DeploySectionProps = {
  site: DashboardSite;
  message: SiteNotice | null;
  onDeploy: (siteId: string, file: File | null, notes?: string) => Promise<void>;
};

function DeploySection({ site, message, onDeploy }: DeploySectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [uploading, setUploading] = useState(false);

  const isSuccess = message?.tone === "success";
  const isError = message?.tone === "error";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploading(true);
    await onDeploy(site.id, file, note);
    setUploading(false);
    if (message?.tone !== "error") {
      setFile(null);
      setNote("");
      event.currentTarget.reset();
    }
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <UploadCloud className="h-4 w-4 text-muted-foreground" />
          Deploy a new version
        </CardTitle>
        <CardDescription>
          Upload a zipped static build. We scan with ClamAV before extraction, then provision nginx with your security presets.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {message ? (
          <Alert
            variant={isError ? "destructive" : "default"}
            className={cn(
              "mb-6 border text-sm",
              isError && "border-danger/40 bg-danger/10 text-danger",
              isSuccess && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
            )}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor={`archive-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Archive (.zip)
            </Label>
            <Input
              id={`archive-${site.id}`}
              type="file"
              accept=".zip"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="cursor-pointer rounded-2xl border-dashed border-border/60 bg-card/50 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-medium file:text-primary-foreground hover:border-border"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`notes-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Deployment notes (optional)
            </Label>
            <Textarea
              id={`notes-${site.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe the release so future collaborators understand the change."
              className="min-h-[90px] rounded-2xl border-border/60 bg-card/50 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Maximum archive size: {Math.round(site.maxUploadSize / (1024 * 1024))} MB</span>
            <Button
              type="submit"
              disabled={uploading || !file}
              className="rounded-full px-6 text-sm font-semibold tracking-wide disabled:cursor-not-allowed"
            >
              {uploading ? "Deploying…" : "Start deployment"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type DomainSectionProps = {
  site: DashboardSite;
  edgeIp: string;
  primaryDomain: string;
  sandboxDomain: string;
  message: SiteNotice | null;
  onDomainChange: (siteId: string, hostname: string) => Promise<void>;
  onDomainPurchase: (siteId: string, domain: string, tlds: string[], budget?: number) => Promise<void>;
};

function DomainSection({
  site,
  edgeIp,
  primaryDomain,
  sandboxDomain,
  message,
  onDomainChange,
  onDomainPurchase,
}: DomainSectionProps) {
  const [value, setValue] = useState(primaryDomain);
  const [requestDomain, setRequestDomain] = useState("");
  const [tlds, setTlds] = useState(".com,.ai");
  const [budget, setBudget] = useState("250");
  const [submittingPrimary, setSubmittingPrimary] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const isError = message?.tone === "error";
  const isSuccess = message?.tone === "success";

  const handlePrimarySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingPrimary(true);
    await onDomainChange(site.id, value.trim());
    setSubmittingPrimary(false);
  };

  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittingRequest(true);
    await onDomainPurchase(
      site.id,
      requestDomain.trim(),
      tlds.split(",").map((item) => item.trim()).filter(Boolean),
      budget ? Number(budget) : undefined,
    );
    setSubmittingRequest(false);
    setRequestDomain("");
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Domain management
        </CardTitle>
        <CardDescription>
          Point your DNS to <span className="text-foreground">{edgeIp}</span>. Sandbox domain <span className="text-foreground">{sandboxDomain}</span> stays available for testing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message ? (
          <Alert
            variant={isError ? "destructive" : "default"}
            className={cn(
              "border text-sm",
              isError && "border-danger/40 bg-danger/10 text-danger",
              isSuccess && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
            )}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}

        <form onSubmit={handlePrimarySubmit} className="space-y-3">
          <Label htmlFor={`primary-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Primary domain
          </Label>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              id={`primary-${site.id}`}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="h-12 rounded-2xl border-border/60 bg-card/50 text-sm"
            />
            <Button
              type="submit"
              disabled={submittingPrimary}
              className="rounded-full px-6 text-sm font-semibold tracking-wide disabled:cursor-not-allowed"
            >
              {submittingPrimary ? "Saving…" : "Save domain"}
            </Button>
          </div>
        </form>

        <Separator className="bg-border/40" />

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Tracked domains</p>
          <div className="space-y-3">
            {site.domains.map((domain) => (
              <div key={domain.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/50 px-4 py-3 text-sm">
                <div className="space-y-1">
                  <p className="text-foreground">{domain.hostname}</p>
                  <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                    {domain.isPrimary ? "Primary" : domain.type === "FREE_SUBDOMAIN" ? "Sandbox" : "Additional"}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={cn("border px-3 py-[5px] text-[11px] uppercase tracking-[0.3em]", DNS_STATUS_MAP[domain.dns?.status ?? "UNRESOLVED"].className)}
                    >
                      {DNS_STATUS_MAP[domain.dns?.status ?? "UNRESOLVED"].label}
                    </Badge>
                  </TooltipTrigger>
                  {domain.dns?.records?.length ? (
                    <TooltipContent side="bottom" className="max-w-sm text-xs">
                      <p className="font-medium text-foreground">Detected A records</p>
                      <ul className="mt-2 space-y-1 text-muted-foreground">
                        {domain.dns.records.map((record) => (
                          <li key={record}>{record}</li>
                        ))}
                      </ul>
                    </TooltipContent>
                  ) : (
                    <TooltipContent side="bottom" className="text-xs text-muted-foreground">
                      DNS records unresolved yet.
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-border/40" />

        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`request-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Request a domain purchase (beta)
            </Label>
            <Input
              id={`request-${site.id}`}
              value={requestDomain}
              onChange={(event) => setRequestDomain(event.target.value)}
              placeholder="preferred-name"
              className="h-12 rounded-2xl border-border/60 bg-card/50 text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`tlds-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Desired TLDs
              </Label>
              <Input
                id={`tlds-${site.id}`}
                value={tlds}
                onChange={(event) => setTlds(event.target.value)}
                placeholder=".com,.ai,.org"
                className="h-12 rounded-2xl border-border/60 bg-card/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`budget-${site.id}`} className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Budget (USD)
              </Label>
              <Input
                id={`budget-${site.id}`}
                type="number"
                min="50"
                step="10"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                className="h-12 rounded-2xl border-border/60 bg-card/50 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submittingRequest || !requestDomain.trim()}
              className="rounded-full px-6 text-sm font-semibold tracking-wide disabled:cursor-not-allowed"
            >
              {submittingRequest ? "Submitting…" : "Submit request"}
            </Button>
          </div>
        </form>

        {site.purchaseRequests.length > 0 ? (
          <>
            <Separator className="bg-border/40" />
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Purchase requests</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {site.purchaseRequests.map((request) => (
                  <div key={request.id} className="flex flex-col gap-1 rounded-2xl border border-border/40 bg-card/50 px-4 py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{request.domain}</span>
                      <Badge variant="outline" className="border border-border/40 px-2 py-[3px] text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {request.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                      TLDs: {request.tlds.join(", ")} · Requested {formatDateTime(request.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

type SecuritySectionProps = {
  site: DashboardSite;
  onSecurityToggle: (siteId: string, payload: Record<string, unknown>) => Promise<void>;
  message: SiteNotice | null;
};

function SecuritySection({ site, onSecurityToggle, message }: SecuritySectionProps) {
  const security = {
    forceHttps: site.securityConfig?.forceHttps ?? true,
    accessLogging: site.securityConfig?.accessLogging ?? true,
    autoIndexing: site.securityConfig?.autoIndexing ?? true,
    firewallEnabled: site.securityConfig?.firewall?.enabled ?? true,
  };

  const isError = message?.tone === "error";
  const isSuccess = message?.tone === "success";

  const options = [
    {
      key: "forceHttps" as const,
      label: "Enforce HTTPS redirects",
      description: "Redirect all HTTP traffic to HTTPS automatically.",
      value: security.forceHttps,
    },
    {
      key: "accessLogging" as const,
      label: "Enable access logging",
      description: "Write structured access logs for auditing and insights.",
      value: security.accessLogging,
    },
    {
      key: "autoIndexing" as const,
      label: "Allow search engine indexing",
      description: "Permit crawlers to index this site. Disable for private sandboxes.",
      value: security.autoIndexing,
    },
    {
      key: "firewallEnabled" as const,
      label: "Edge firewall (bot & geo filters)",
      description: "Apply baseline firewall rules and block malicious bots automatically.",
      value: security.firewallEnabled,
    },
  ];

  const handleToggle = async (key: typeof options[number]["key"], value: boolean) => {
    const payload =
      key === "firewallEnabled"
        ? { firewall: { enabled: value } }
        : { [key]: value };
    await onSecurityToggle(site.id, payload);
  };

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Security presets
        </CardTitle>
        <CardDescription>
          Fine-tune runtime safeguards per site. Changes take effect instantly without redeploying.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? (
          <Alert
            variant={isError ? "destructive" : "default"}
            className={cn(
              "border text-sm",
              isError && "border-danger/40 bg-danger/10 text-danger",
              isSuccess && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
            )}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-4">
          {options.map((option) => (
            <div key={option.key} className="flex items-start justify-between gap-4 rounded-2xl border border-border/40 bg-card/50 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
              <Switch
                checked={option.value}
                onCheckedChange={(checked) => void handleToggle(option.key, checked)}
                className="data-[state=checked]:bg-foreground"
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type ControlsSectionProps = {
  site: DashboardSite;
  message: SiteNotice | null;
  onPause: (siteId: string) => Promise<void>;
  onResume: (siteId: string) => Promise<void>;
  onDelete: (siteId: string, siteName: string) => Promise<void>;
  onDownload: (siteId: string) => void;
};

function ControlsSection({ site, message, onPause, onResume, onDelete, onDownload }: ControlsSectionProps) {
  const isPaused = site.status === "DISABLED";
  const isSuccess = message?.tone === "success";
  const isError = message?.tone === "error";

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="space-y-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Operational controls
        </CardTitle>
        <CardDescription>
          Manage runtime availability, download the latest bundle, or remove the site entirely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {message ? (
          <Alert
            variant={isError ? "destructive" : "default"}
            className={cn(
              "border text-sm",
              isError && "border-danger/40 bg-danger/10 text-danger",
              isSuccess && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
            )}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            variant="outline"
            className="h-11 rounded-full border-border/60 bg-transparent text-sm font-semibold tracking-wide text-foreground hover:bg-card/60"
            onClick={() => onDownload(site.id)}
            disabled={!site.hasArchive}
          >
            <Download className="mr-2 h-4 w-4" />
            Download current build
          </Button>
          {isPaused ? (
            <Button
              className="h-11 rounded-full text-sm font-semibold tracking-wide"
              onClick={() => onResume(site.id)}
            >
              <Play className="mr-2 h-4 w-4" />
              Resume site
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-11 rounded-full border-border/60 bg-transparent text-sm font-semibold tracking-wide text-foreground hover:bg-card/60"
              onClick={() => onPause(site.id)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause site
            </Button>
          )}
        </div>
        <div>
          <Button
            variant="outline"
            className="h-11 w-full rounded-full border-red-500/40 bg-red-500/10 text-sm font-semibold tracking-wide text-red-200 hover:bg-red-500/20"
            onClick={() => onDelete(site.id, site.name)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete site
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type DeploymentTableProps = {
  deployments: DashboardSite["deployments"];
};

function DeploymentTable({ deployments }: DeploymentTableProps) {
  if (deployments.length === 0) {
    return (
      <Card className="border-border/40 bg-card/60">
        <CardHeader>
          <CardTitle className="text-lg">No deployments yet</CardTitle>
          <CardDescription>Deploy a build to populate history with versioned releases.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 bg-card/60">
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Recent deployments</CardTitle>
        <CardDescription>Only the latest deployment stays live. Previous versions are retained for rollback.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px] text-xs uppercase tracking-[0.3em] text-muted-foreground">Deployed</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Status</TableHead>
              <TableHead className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deployments.map((deployment) => {
              const status = STATUS_MAP[deployment.status] ?? STATUS_MAP.PENDING;
              return (
                <TableRow key={deployment.id} className="border-border/30">
                  <TableCell className="text-sm text-foreground">{formatDateTime(deployment.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("border px-3 py-[5px] text-[11px] uppercase tracking-[0.3em]", status.className)}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{deployment.notes ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string | null): string {
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
