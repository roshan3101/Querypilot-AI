"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import Sidebar from "./Sidebar";
import { Zap } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  useEffect(() => {
    // Only redirect after Zustand has read localStorage — prevents flash-redirect on refresh
    if (hasHydrated && !token) {
      router.push("/login");
    }
  }, [hasHydrated, token, router]);

  // Show a minimal spinner while Zustand is rehydrating from localStorage
  if (!hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-2xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20 animate-pulse">
            <Zap className="w-6 h-6 text-[hsl(var(--primary))]" />
          </div>
          <div className="h-1 w-24 bg-[hsl(var(--border))] rounded-full overflow-hidden">
            <div className="h-full bg-[hsl(var(--primary))] rounded-full animate-[shimmer_1s_ease-in-out_infinite]" style={{ width: "60%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
