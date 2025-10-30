"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={loading}
      className="h-9 rounded-full border border-border/60 bg-transparent px-4 text-xs font-medium tracking-wide text-muted-foreground transition hover:border-border hover:bg-card/50 hover:text-foreground"
      onClick={handleLogout}
    >
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
