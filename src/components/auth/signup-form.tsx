"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error ?? "Unable to complete signup.");
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
        <Label htmlFor="fullName" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Full name
        </Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required
          placeholder="Ada Lovelace"
          className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@example.com"
          className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Confirm password
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            placeholder="••••••••"
            className="h-12 rounded-2xl border-border/60 bg-card/60 text-sm text-foreground placeholder:text-muted-foreground/70"
          />
        </div>
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
        {loading ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
