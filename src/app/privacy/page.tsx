import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Notice — Noesis Hosting",
};

const sections = [
  {
    title: "1. Data Controller",
    body:
      "Noesis AI, Via Torino 4, 20100 Milan, Italy, acts as the data controller for the Noesis Hosting platform.",
  },
  {
    title: "2. Data We Collect",
    body:
      "Account details (email, name), deployment metadata, audit logs, and diagnostic metrics. Access logs contain IP, user agent, and timestamps for security analysis.",
  },
  {
    title: "3. How We Use Data",
    body:
      "To operate and secure the hosting service, prevent abuse, comply with legal obligations, and communicate important product updates.",
  },
  {
    title: "4. Retention",
    body:
      "Account data is retained while the account is active. Deployment logs are kept for 12 months, while security and access logs may be stored for up to 180 days.",
  },
  {
    title: "5. Subprocessors",
    body:
      "We rely on Cloudflare for traffic proxying and TLS termination. PostgreSQL databases are hosted on our managed infrastructure in the EU. Additional subprocessors will be documented in the dashboard.",
  },
  {
    title: "6. Your Rights",
    body:
      "You may request access, correction, deletion, or export of your personal data by emailing privacy@noesisai.org. We will respond within 30 days.",
  },
  {
    title: "7. Security",
    body:
      "We implement defense-in-depth measures including encryption in transit, antivirus scanning, least-privilege access controls, and continuous monitoring.",
  },
  {
    title: "8. International Transfers",
    body:
      "Data may be processed outside your jurisdiction. When this occurs, we rely on standard contractual clauses or equivalent safeguards.",
  },
  {
    title: "9. Updates",
    body:
      "We may revise this Notice as the platform evolves. Material changes will be communicated via email or in-app notifications.",
  },
  {
    title: "10. Contact",
    body:
      "Reach us at privacy@noesisai.org with the subject line “Noesis Hosting Privacy”.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-24">
      <Card className="border-border/50 bg-card/75 shadow-[0_40px_120px_-90px_rgba(0,0,0,0.65)] backdrop-blur">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit border-border/40 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Legal
          </Badge>
          <CardTitle className="text-3xl font-semibold md:text-4xl">Privacy Notice</CardTitle>
          <CardDescription className="text-sm text-muted">
            Effective date: {new Date().toISOString().slice(0, 10)}. This notice explains how Noesis Hosting handles personal data.
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
