import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { listSitesForUser } from "@/lib/sites";
import { env } from "@/lib/env";
import { checkDomainARecord } from "@/lib/dns";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { LogoutButton } from "@/components/auth/logout-button";

export const metadata = {
  title: "Dashboard — Noesis Hosting",
};

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const sites = await listSitesForUser(session.userId);
  type ListedSite = Prisma.SiteGetPayload<{
    include: { domains: true; deployments: true; purchaseRequests: true };
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

  const serializedSites = typedSites.map((site) => ({
    id: site.id,
    name: site.name,
    slug: site.slug,
    status: site.status,
    maxUploadSize: site.maxUploadSize,
    lastDeploymentAt: site.lastDeploymentAt ? site.lastDeploymentAt.toISOString() : null,
    createdAt: site.createdAt.toISOString(),
    securityConfig: (site.securityConfig as Record<string, unknown>) ?? null,
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
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 px-6 pb-20 pt-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Noesis Hosting Control Center</h1>
        <LogoutButton />
      </div>
      <DashboardClient
        user={{ email: session.user.email, fullName: session.user.fullName }}
        freeDomainSuffix={env.PLATFORM_FREE_DOMAIN}
        edgeIp={env.PLATFORM_EDGE_IP}
        sites={serializedSites}
      />
    </main>
  );
}
