"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap, LayoutDashboard, MessageSquare, Database,
  History, Upload, LogOut, ChevronRight
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { href: "/dashboard",   label: "Dashboard",     icon: LayoutDashboard, desc: "Overview & analytics" },
  { href: "/query",       label: "AI Query",       icon: MessageSquare,   desc: "Natural language SQL" },
  { href: "/connections", label: "Connections",    icon: Database,        desc: "Manage databases" },
  { href: "/history",     label: "History",        icon: History,         desc: "Past queries" },
  { href: "/csv",         label: "CSV Upload",     icon: Upload,          desc: "Import data" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  function handleLogout() {
    logout();
    localStorage.removeItem("token");
    toast.success("Signed out");
    router.push("/login");
  }

  return (
    <aside className="w-64 bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--border))] flex flex-col min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[hsl(var(--border))]">
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20">
            <Zap className="w-5 h-5 text-[hsl(var(--primary))]" />
            <div className="absolute inset-0 rounded-xl bg-[hsl(var(--primary))]/5 blur-sm" />
          </div>
          <div>
            <p className="font-bold text-[hsl(var(--foreground))] text-sm tracking-tight">QueryPilot AI</p>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-medium tracking-widest uppercase">SQL Assistant</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-semibold tracking-widest uppercase text-[hsl(var(--muted-foreground))]">Menu</p>
        {navItems.map(({ href, label, icon: Icon, desc }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn(
              "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative",
              active
                ? "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))]"
            )}>
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[hsl(var(--primary))] rounded-full" />
              )}
              <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]")} />
              <div className="min-w-0">
                <p className="font-medium leading-none">{label}</p>
                <p className={cn("text-[11px] mt-0.5 truncate transition-colors", active ? "text-[hsl(var(--primary))]/70" : "text-[hsl(var(--muted-foreground))]")}>{desc}</p>
              </div>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[hsl(var(--primary))]" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[hsl(var(--border))] space-y-1">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[hsl(var(--foreground))] truncate">{user?.username}</p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[hsl(var(--muted-foreground))] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
