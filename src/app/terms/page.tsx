import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Use — Noesis Hosting",
};

const sections = [
  {
    title: "1. Introduction",
    body:
      "Noesis Hosting is a service operated by Noesis AI, a non-profit research organization based in Milan, Italy. By creating an account or uploading content, you agree to these Terms of Use.",
  },
  {
    title: "2. Eligibility",
    body:
      "You must be at least 16 years old. By registering, you confirm that you are authorized to bind yourself or the organization you represent.",
  },
  {
    title: "3. Acceptable Use",
    body:
      "Host only static assets you are legally allowed to distribute. Malicious code, unauthorized data collection, or content that violates applicable laws, the Noesis AI License Agreement, or Cloudflare policies is strictly prohibited.",
  },
  {
    title: "4. Uploads & Antivirus",
    body:
      "All archives are scanned with ClamAV before deployment. If malware is detected, the upload is rejected and the account may be suspended. Do not attempt to bypass or disable this safeguard.",
  },
  {
    title: "5. Domains",
    body:
      "You are responsible for configuring DNS records for any custom domain you map. Free staging subdomains under hosting.noesisai.org are provided on a best-effort basis and may be reclaimed if inactive for 90 days.",
  },
  {
    title: "6. Service Level",
    body:
      "Noesis Hosting is provided “as is”. We strive for high availability but do not offer formal SLAs. Planned maintenance will be announced ahead of time whenever possible.",
  },
  {
    title: "7. Data & Logs",
    body:
      "We store deployment metadata, audit logs, and security events to operate the platform. Access logs may be retained for up to 180 days for security purposes.",
  },
  {
    title: "8. Suspension & Termination",
    body:
      "We reserve the right to suspend or terminate accounts that violate these Terms, applicable laws, or the ethical standards of the Noesis AI project.",
  },
  {
    title: "9. Changes",
    body:
      "We may update these Terms. When changes are material, we will notify you via email or through the dashboard. Continued use constitutes acceptance.",
  },
  {
    title: "10. Contact",
    body:
      "Questions can be sent to info@noesisai.org with the subject line “Noesis Hosting Terms”.",
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
