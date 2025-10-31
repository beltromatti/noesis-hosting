import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { DomainType } from "@prisma/client";
import { ArrowUpRight } from "lucide-react";
import { getSession } from "@/lib/session";
import { listSitesForUser } from "@/lib/sites";
import { env } from "@/lib/env";
import { checkDomainARecord } from "@/lib/dns";
import Link from "next/link";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { LogoutButton } from "@/components/auth/logout-button";
import { noteDomainInsight } from "@/lib/analytics";

export const metadata = {
  title: "Dashboard — Noesis Hosting",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const isAdmin = session.user.role === "ADMIN";

  const sites = await listSitesForUser(session.userId);
  type ListedSite = Prisma.SiteGetPayload<{
    include: { domains: true; deployments: true; purchaseRequests: true; securityProfile: true };
  }>;
  const typedSites = sites as ListedSite[];

  const uniqueHostnames = Array.from(
    new Set(
      typedSites.flatMap((site) => site.domains.map((domain) => domain.hostname.toLowerCase())),
    ),
  );

  const dnsPairs = await Promise.all(
    uniqueHostnames.map(async (hostname) => {
      const result = await checkDomainARecord(hostname);
      return [hostname, result] as const;
    }),
  );

  const dnsByHostname = new Map(dnsPairs);

  await Promise.all(
    typedSites.map(async (site) => {
      const primaryDomain = site.domains.find((domain) => domain.isPrimary) ?? site.domains[0];
      if (!primaryDomain) return;
      const dns = dnsByHostname.get(primaryDomain.hostname.toLowerCase());
      if (!dns) return;
      const dnsVerified =
        primaryDomain.type === DomainType.FREE_SUBDOMAIN ||
        dns.status === "MATCH" ||
        dns.status === "PROXIED";
      await noteDomainInsight({
        siteId: site.id,
        dnsVerified,
        proxied: dns.status === "PROXIED" || dns.proxied === true,
      });
    }),
  );

  const serializedSites = typedSites.map((site) => ({
    id: site.id,
    name: site.name,
    slug: site.slug,
    status: site.status,
    runtime: site.runtime,
    maxUploadSize: site.maxUploadSize,
    lastDeploymentAt: site.lastDeploymentAt ? site.lastDeploymentAt.toISOString() : null,
    createdAt: site.createdAt.toISOString(),
    securityConfig: (site.securityConfig as Record<string, unknown>) ?? null,
    securityProfile: site.securityProfile
      ? {
          runtime: site.securityProfile.runtime,
          cpuLimitPercent: site.securityProfile.cpuLimitPercent,
          memoryLimitMb: site.securityProfile.memoryLimitMb,
          storageLimitMb: site.securityProfile.storageLimitMb,
          processLimit: site.securityProfile.processLimit,
          lastScanAt: site.securityProfile.lastScanAt ? site.securityProfile.lastScanAt.toISOString() : null,
          lastScanStatus: site.securityProfile.lastScanStatus,
          lastScanNotes: site.securityProfile.lastScanNotes,
        }
      : null,
    hasArchive: site.deployments.length > 0,
    domains: site.domains.map((domain) => ({
      id: domain.id,
      hostname: domain.hostname,
      isPrimary: domain.isPrimary,
      verificationStatus: domain.verificationStatus,
      type: domain.type,
      createdAt: domain.createdAt.toISOString(),
      dns: dnsByHostname.get(domain.hostname.toLowerCase()) ?? null,
    })),
    deployments: [...site.deployments]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((deployment) => ({
        id: deployment.id,
        status: deployment.status,
        createdAt: deployment.createdAt.toISOString(),
        notes: deployment.notes,
      })),
    purchaseRequests: site.purchaseRequests.map((request) => ({
      id: request.id,
      domain: request.domain,
      status: request.status,
      tlds: request.tlds,
      createdAt: request.createdAt.toISOString(),
    })),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-10 px-6 pb-20 pt-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Noesis Hosting control centre</h1>
          <p className="text-sm text-muted-foreground">
            Manage deployments, domains, and security for every static or PHP-powered environment.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              href="/admin/console"
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary transition hover:border-primary hover:text-primary/90"
            >
              Admin console
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>
      <DashboardClient
        user={{ email: session.user.email, fullName: session.user.fullName }}
        freeDomainSuffix={env.PLATFORM_FREE_DOMAIN}
        edgeIp={env.PLATFORM_EDGE_IP}
        sites={serializedSites}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Noesis AI</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy Notice
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms of Use
          </Link>
        </div>
      </div>
    </main>
  );
}
