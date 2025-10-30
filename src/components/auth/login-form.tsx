"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to sign in.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
          className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
          placeholder="••••••••"
          className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      {error ? (
        <Alert variant="destructive" className="border-danger/40 bg-danger/10 text-sm text-danger">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full rounded-full text-sm font-semibold tracking-wide disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
