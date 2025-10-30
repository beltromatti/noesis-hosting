import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "@/components/auth/signup-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Create account — Noesis Hosting",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-24">
      <Card className="w-full max-w-xl border-border/60 bg-card/80 shadow-[0_36px_120px_-80px_rgba(0,0,0,0.7)] backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto w-fit border-border/60 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Get started
          </Badge>
          <CardTitle className="text-3xl font-semibold">Create your Noesis Hosting account</CardTitle>
          <CardDescription className="text-sm text-muted">
            Free static hosting with guided DNS, antivirus scanning, and production-grade nginx automation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignupForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 text-center text-sm text-muted">
          <p>
            Already have an account?{" "}
            <Link className="font-medium text-foreground hover:text-foreground/80" href="/login">
              Sign in instead
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            By creating an account you agree to the{" "}
            <Link className="text-foreground hover:text-foreground/80" href="/terms">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link className="text-foreground hover:text-foreground/80" href="/privacy">
              Privacy Notice
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
