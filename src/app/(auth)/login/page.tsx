import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Sign in — Noesis Hosting",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-24">
      <Card className="w-full max-w-xl border-border/60 bg-card/80 shadow-[0_36px_120px_-80px_rgba(0,0,0,0.7)] backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto w-fit border-border/60 bg-transparent px-4 py-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Welcome back
          </Badge>
          <CardTitle className="text-3xl font-semibold">Sign in to Noesis Hosting</CardTitle>
          <CardDescription className="text-sm text-muted">
            Deploy static sites with automated nginx provisioning, antivirus scanning, and guided DNS.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LoginForm />
        </CardContent>
        <CardFooter className="flex flex-col gap-3 text-center text-sm text-muted">
          <p>
            Need an account?{" "}
            <Link className="font-medium text-foreground hover:text-foreground/80" href="/signup">
              Create one for free
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            By signing in you agree to the{" "}
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
