"use client";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Zap, Database, MessageSquare, BarChart2, Shield,
  ArrowRight, CheckCircle, History, Upload, Sparkles,
  Code2, Table2, TrendingUp, GitBranch, Lock, Cpu
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Natural Language to SQL",
    description: "Type questions in plain English. QueryPilot generates production-ready SQL instantly — no SQL knowledge required.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: Database,
    title: "Schema-Aware Queries",
    description: "Automatically discovers all your tables, columns, foreign keys, and relationships to generate accurate JOINs every time.",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  {
    icon: Shield,
    title: "Read-Only Safety Layer",
    description: "Every query is validated before execution. DROP, DELETE, UPDATE, INSERT are blocked. Only safe analytical queries run.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  {
    icon: BarChart2,
    title: "Auto Visualizations",
    description: "Results are automatically rendered as bar, line, or pie charts based on your data shape. No chart configuration needed.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
  },
  {
    icon: Sparkles,
    title: "Query Optimization",
    description: "AI reviews your generated SQL and suggests index hints, rewrites, and performance improvements in real-time.",
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
  },
  {
    icon: History,
    title: "Query History",
    description: "Every query is saved with its SQL, explanation, execution time, and results. Browse, re-run, or delete anytime.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Upload,
    title: "CSV Upload",
    description: "Upload any CSV file. It becomes a queryable PostgreSQL table instantly — stored permanently on Cloudinary.",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },
  {
    icon: TrendingUp,
    title: "Usage Analytics",
    description: "Track query counts, success rates, average execution times, and which tables you query most on the dashboard.",
    color: "text-teal-400",
    bg: "bg-teal-400/10 border-teal-400/20",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Connect your database",
    description: "Paste your PostgreSQL connection URL or fill in the fields manually. We test the connection before saving.",
    icon: Database,
  },
  {
    step: "02",
    title: "Ask in plain English",
    description: "Type a question like \"Show monthly revenue for this year\" or \"Top 10 customers by purchase value\".",
    icon: MessageSquare,
  },
  {
    step: "03",
    title: "Review generated SQL",
    description: "The AI explains what the query does and suggests optimizations. Edit the SQL directly if needed.",
    icon: Code2,
  },
  {
    step: "04",
    title: "Execute and visualize",
    description: "Run the query and see results as a table or auto-generated chart. Results load in milliseconds.",
    icon: BarChart2,
  },
];

const LLM_PROVIDERS = ["OpenAI GPT-4o", "Gemini 2.5 Flash", "OpenRouter"];
const DB_SUPPORT = ["PostgreSQL", "Render", "Supabase", "Railway", "Neon"];

const SQL_DEMO = `-- AI Generated for: "Show monthly revenue this year"
SELECT
  DATE_TRUNC('month', o.created_at) AS month,
  SUM(oi.quantity * oi.unit_price)  AS revenue,
  COUNT(DISTINCT o.id)              AS order_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.created_at >= DATE_TRUNC('year', NOW())
  AND o.status = 'completed'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 12;`;

export default function LandingPage() {
  const token = useAuthStore((s) => s.token);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">

      {/* ── Nav ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20">
              <Zap className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <span className="font-bold text-[hsl(var(--foreground))] tracking-tight">QueryPilot AI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {hasHydrated && token ? (
              <Button asChild size="sm">
                <Link href="/dashboard" className="gap-1.5">
                  Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register" className="gap-1.5">
                    Get started <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        {/* Glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[hsl(var(--primary))]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-32 left-1/4 w-64 h-64 bg-violet-500/8 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-48 h-48 bg-blue-500/8 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <Badge variant="default" className="mb-6 gap-2 px-4 py-1.5 text-xs font-medium">
            <Sparkles className="w-3 h-3" />
            Powered by Gemini · OpenAI · OpenRouter
          </Badge>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.08] mb-6">
            Query your database
            <br />
            <span className="gradient-text">in plain English</span>
          </h1>

          <p className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect your PostgreSQL database and ask questions naturally.
            QueryPilot AI generates SQL, explains it, executes it, and
            visualizes results — all in seconds.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 text-base">
              <Link href="/register">
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="gap-2 text-base">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4">
            No credit card required · Works with any PostgreSQL database
          </p>
        </div>

        {/* SQL demo card */}
        <div className="relative max-w-3xl mx-auto mt-16">
          <div className="absolute inset-0 bg-[hsl(var(--primary))]/10 rounded-2xl blur-2xl" />
          <div className="relative rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-2xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/50">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-3 h-6 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] flex items-center px-3">
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">querypilot.ai/query</span>
              </div>
            </div>
            {/* Natural language input */}
            <div className="px-5 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--primary))]/5">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/15">
                  <MessageSquare className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                </div>
                <span className="text-sm text-[hsl(var(--foreground))]">Show monthly revenue for this year</span>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[hsl(var(--primary))] font-medium">
                  <Sparkles className="w-3 h-3" /> Generated
                </div>
              </div>
            </div>
            {/* SQL */}
            <pre className="px-5 py-4 sql-code text-xs text-emerald-400 dark:text-emerald-300 overflow-auto leading-relaxed">
              {SQL_DEMO}
            </pre>
            {/* Result preview */}
            <div className="border-t border-[hsl(var(--border))] px-5 py-3 bg-[hsl(var(--secondary))]/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Table2 className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">12 rows</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">142ms</span>
                </div>
              </div>
              <div className="flex gap-1">
                {["Table", "Chart", "SQL"].map((t) => (
                  <span key={t} className={`text-[10px] px-2 py-0.5 rounded-md ${t === "Chart" ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20" : "text-[hsl(var(--muted-foreground))]"}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Supported providers ───────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-[hsl(var(--border))] bg-[hsl(var(--secondary))]/20">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-center">
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-3">LLM Providers</p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {LLM_PROVIDERS.map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs px-3 py-1">{p}</Badge>
                ))}
              </div>
            </div>
            <div className="w-px h-10 bg-[hsl(var(--border))] hidden sm:block" />
            <div>
              <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-3">Database Hosts</p>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {DB_SUPPORT.map((d) => (
                  <Badge key={d} variant="outline" className="text-xs px-3 py-1">{d}</Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4 text-xs px-3 py-1">Features</Badge>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Everything you need to
              <span className="gradient-text"> query smarter</span>
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              From NL-to-SQL to auto-charts, QueryPilot AI covers the full analytics workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, description, color, bg }) => (
              <div
                key={title}
                className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 hover:border-[hsl(var(--primary))]/30 hover:shadow-lg hover:shadow-[hsl(var(--primary))]/5 transition-all duration-300"
              >
                <div className={`inline-flex p-2.5 rounded-xl border mb-4 ${bg}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[hsl(var(--secondary))]/20 border-y border-[hsl(var(--border))]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4 text-xs px-3 py-1">How it works</Badge>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              From question to
              <span className="gradient-text"> chart in 4 steps</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ step, title, description, icon: Icon }, i) => (
              <div key={step} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[hsl(var(--border))] to-transparent z-10 -translate-y-px" />
                )}
                <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/15">
                      <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                    </div>
                    <span className="text-3xl font-black text-[hsl(var(--border))] leading-none">{step}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{title}</h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4 text-xs px-3 py-1">Tech Stack</Badge>
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Built with
              <span className="gradient-text"> production-grade</span> tools
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { icon: Cpu, label: "FastAPI", desc: "Async Python backend", color: "text-teal-400", bg: "bg-teal-400/10 border-teal-400/20" },
              { icon: Database, label: "PostgreSQL", desc: "Battle-tested relational DB", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
              { icon: Zap, label: "Next.js 16", desc: "React App Router frontend", color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
              { icon: Sparkles, label: "Gemini / GPT", desc: "LLM for SQL generation", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
              { icon: Lock, label: "JWT Auth", desc: "Secure token-based auth", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
              { icon: GitBranch, label: "Alembic", desc: "Database schema migrations", color: "text-pink-400", bg: "bg-pink-400/10 border-pink-400/20" },
            ].map(({ icon: Icon, label, desc, color, bg }) => (
              <div key={label} className="flex items-center gap-3 p-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--primary))]/20 transition-all">
                <div className={`p-2 rounded-xl border ${bg} flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ───────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[hsl(var(--secondary))]/20 border-y border-[hsl(var(--border))]">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Badge variant="default" className="mb-4 text-xs px-3 py-1">What&apos;s included</Badge>
            <h2 className="text-4xl font-bold tracking-tight mb-6">
              Everything in one
              <span className="gradient-text"> unified tool</span>
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8 leading-relaxed">
              No stitching together separate tools. QueryPilot AI handles schema discovery,
              SQL generation, safety checks, execution, visualization, and history —
              all in a single cohesive interface.
            </p>
            <Button size="lg" asChild className="gap-2">
              <Link href="/register">
                Start querying free <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="space-y-3">
            {[
              "Multi-database connections per account",
              "AI-powered SQL with schema context",
              "Read-only safety layer (no mutations)",
              "Bar, line, and pie chart auto-detection",
              "SQL explanation in plain English",
              "Query optimization suggestions",
              "Full query history with re-run",
              "CSV upload → queryable table",
              "Cloudinary file storage for CSVs",
              "Usage analytics dashboard",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-[hsl(var(--foreground))]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[hsl(var(--primary))]/5 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[hsl(var(--primary))]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex p-3 rounded-2xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20 mb-6">
            <Zap className="w-6 h-6 text-[hsl(var(--primary))]" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
            Start talking to your
            <span className="gradient-text"> database today</span>
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-10 text-lg">
            Connect in 30 seconds. Ask your first question in plain English.
            No SQL expertise required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild className="gap-2 text-base">
              <Link href="/register">
                Create free account <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-[hsl(var(--border))] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20">
              <Zap className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            </div>
            <span className="font-semibold text-sm">QueryPilot AI</span>
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Built with FastAPI · Next.js · PostgreSQL · LLM
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Sign in</Link>
            <Link href="/register" className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
