"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Zap, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.data.access_token, res.data.user);
      localStorage.setItem("token", res.data.access_token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] relative overflow-hidden px-4">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[hsl(var(--primary))]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="p-3 rounded-2xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20">
              <Zap className="w-7 h-7 text-[hsl(var(--primary))]" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-[hsl(var(--primary))]/10 blur-xl" />
          </div>
          <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">QueryPilot <span className="gradient-text">AI</span></h1>
          <p className="text-[hsl(var(--muted-foreground))] text-sm mt-1">Natural language SQL assistant</p>
        </div>

        <Card className="border-[hsl(var(--border))] shadow-2xl">
          <CardHeader className="pb-2">
            <h2 className="text-xl font-semibold text-center">Sign in</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center">Welcome back</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Email</label>
                <Input
                  type="email" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[hsl(var(--foreground))]">Password</label>
                <Input
                  type="password" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            <p className="text-center text-[hsl(var(--muted-foreground))] text-sm pt-2">
              No account?{" "}
              <Link href="/register" className="text-[hsl(var(--primary))] hover:underline font-medium">Create one</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
