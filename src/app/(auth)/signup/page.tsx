import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Create account — Noesis Hosting",
};

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20">
      <div className="glass-panel glow-border w-full max-w-xl space-y-8 p-10">
        <div className="space-y-3 text-center">
          <span className="tag mx-auto">Get started</span>
          <h1 className="text-3xl font-semibold">Create your Noesis Hosting account</h1>
          <p className="text-sm text-muted">
            Free static web hosting with guided DNS, antivirus scanning, and production-grade nginx automation.
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link className="text-accent hover:text-accent/80" href="/login">
            Sign in instead
          </Link>
        </p>
        <p className="text-xs text-muted">
          By creating an account you agree to the{" "}
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
