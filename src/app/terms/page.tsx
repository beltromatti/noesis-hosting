import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Use — Noesis Hosting",
};

const sections = [
  {
    title: "1. Introduction",
    body:
      "Noesis Hosting is a self-hostable hosting-platform web application. If you operate an instance, you are responsible for adapting these Terms of Use to your own service, jurisdiction, and business model.",
  },
  {
    title: "2. Eligibility",
    body:
      "You must be at least 16 years old. By registering, you confirm that you are authorized to bind yourself or the organization you represent.",
  },
  {
    title: "3. Acceptable Use",
    body:
      "Host only assets you are legally allowed to distribute. Malicious code, unauthorized data collection, or content that violates applicable laws, your platform policies, or your infrastructure provider policies should be prohibited.",
  },
  {
    title: "4. Uploads & Antivirus",
    body:
      "All archives are scanned with ClamAV before deployment. If malware is detected, the upload is rejected and the account may be suspended. Do not attempt to bypass or disable this safeguard.",
  },
  {
    title: "5. Domains",
    body:
      "Users are responsible for configuring DNS records for any custom domain they map. If you offer staging subdomains, define the base domain, inactivity rules, and reclamation policy for your own instance.",
  },
  {
    title: "6. Service Level",
    body:
      "Noesis Hosting is provided as source code under the project license. Each operator is responsible for defining availability, support, and maintenance commitments for their own hosted instance.",
  },
  {
    title: "7. Data & Logs",
    body:
      "We store deployment metadata, audit logs, and security events to operate the platform. Access logs may be retained for up to 180 days for security purposes.",
  },
  {
    title: "8. Suspension & Termination",
    body:
      "Operators should reserve the right to suspend or terminate accounts that violate their Terms, applicable laws, or platform safety policies.",
  },
  {
    title: "9. Changes",
    body:
      "We may update these Terms. When changes are material, we will notify you via email or through the dashboard. Continued use constitutes acceptance.",
  },
  {
    title: "10. Contact",
    body:
      "Replace this section with the legal contact address for your own hosting service before operating a public instance.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-24">
      <Card className="border-border/50 bg-card/75 shadow-[0_40px_120px_-90px_rgba(0,0,0,0.65)] backdrop-blur">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Legal
          </Badge>
          <CardTitle className="text-3xl font-semibold md:text-4xl">Terms of Use</CardTitle>
          <CardDescription className="text-sm text-muted">
            Effective date: {new Date().toISOString().slice(0, 10)}. These terms govern access to the Noesis Hosting platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm leading-relaxed text-muted">
          {sections.map((section) => (
            <section key={section.title} className="space-y-2">
              <h2 className="text-lg font-medium text-foreground">{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
