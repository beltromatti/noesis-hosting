import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Sign in — Noesis Hosting",
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20">
      <div className="glass-panel glow-border w-full max-w-xl space-y-8 p-10">
        <div className="space-y-3 text-center">
          <span className="tag mx-auto">Welcome back</span>
          <h1 className="text-3xl font-semibold">Sign in to Noesis Hosting</h1>
          <p className="text-sm text-muted">
            Deploy static sites with automated nginx provisioning, antivirus scanning, and guided DNS.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted">
          Need an account?{" "}
          <Link className="text-accent hover:text-accent/80" href="/signup">
            Create one for free
          </Link>
        </p>
        <p className="text-xs text-muted">
          By signing in you agree to the{" "}
          <Link className="text-accent hover:text-accent/80" href="/terms">
            Terms of Use
          </Link>{" "}and{" "}
          <Link className="text-accent hover:text-accent/80" href="/privacy">
            Privacy Notice
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
