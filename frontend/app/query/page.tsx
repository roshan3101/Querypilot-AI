"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { connectionsApi, queriesApi } from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import ResultChart from "@/components/query/ResultChart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import toast from "react-hot-toast";
import { Send, Play, Sparkles, BarChart2, Table2, Code2, Lightbulb, Zap, ChevronRight } from "lucide-react";
import { formatMs, cn } from "@/lib/utils";

type Tab = "table" | "chart" | "sql";

const EXAMPLES = [
  "Show all tables with their row counts",
  "Top 10 most recent records",
  "Monthly counts for this year",
  "Records created in the last 7 days",
];

export default function QueryPage() {
  const [connectionId, setConnectionId] = useState<string>("");
  const [nl, setNl] = useState("");
  const [generated, setGenerated] = useState<{ generated_sql: string; explanation: string; optimized_sql?: string | null; optimization_notes?: string | null; tables_used: string[] } | null>(null);
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[][]; row_count: number; execution_time_ms: number; suggested_chart: string | null } | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [editedSQL, setEditedSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tab, setTab] = useState<Tab>("table");

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data),
  });

  async function handleGenerate() {
    if (!connectionId || !nl.trim()) { toast.error("Select a connection and enter a question"); return; }
    setIsGenerating(true); setGenerated(null); setResult(null);
    try {
      const res = await queriesApi.generate({ connection_id: Number(connectionId), natural_language: nl });
      setGenerated(res.data); setEditedSQL(res.data.generated_sql);
      toast.success("SQL generated!");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Generation failed");
    } finally { setIsGenerating(false); }
  }

  async function handleExecute(sql?: string) {
    if (!connectionId) return;
    const sqlToRun = sql ?? editedSQL;
    setIsExecuting(true);
    try {
      const res = await queriesApi.execute({ connection_id: Number(connectionId), sql: sqlToRun, history_id: historyId ?? undefined });
      setResult(res.data);
      setTab(res.data.suggested_chart && res.data.suggested_chart !== "table" ? "chart" : "table");
      toast.success(`${res.data.row_count} rows · ${formatMs(res.data.execution_time_ms)}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Execution failed");
    } finally { setIsExecuting(false); }
  }

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Query</h1>
          <p className="text-[hsl(var(--muted-foreground))] mt-1">Ask your database anything in plain English</p>
        </div>

        {/* Input card */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--primary))]/5 rounded-full blur-3xl pointer-events-none translate-x-16 -translate-y-16" />
          <CardContent className="p-6 space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">Database Connection</label>
              <Select value={connectionId} onValueChange={setConnectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a connection..." />
                </SelectTrigger>
                <SelectContent>
                  {(connections as { id: number; name: string; database: string }[]).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} <span className="text-[hsl(var(--muted-foreground))] ml-1">({c.database})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[hsl(var(--foreground))]">Ask a question</label>
              <div className="relative">
                <Textarea
                  value={nl}
                  onChange={(e) => setNl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  rows={3}
                  className="pr-14"
                  placeholder="e.g. Show monthly revenue for this year, top 10 customers by purchase amount..."
                />
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !connectionId || !nl.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-30 rounded-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Press Enter to generate · Shift+Enter for newline</p>
            </div>

            {/* Example questions */}
            {!generated && (
              <div className="flex flex-wrap gap-2 pt-1">
                {EXAMPLES.map((q) => (
                  <button
                    key={q}
                    onClick={() => setNl(q)}
                    className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--secondary))]/80 px-3 py-1.5 rounded-full border border-[hsl(var(--border))] transition-all duration-200 flex items-center gap-1.5"
                  >
                    <ChevronRight className="w-3 h-3" />
                    {q}
                  </button>
                ))}
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center gap-3 text-[hsl(var(--primary))] text-sm">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Analyzing schema and generating SQL...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generated SQL */}
        {generated && (
          <Card className="border-[hsl(var(--primary))]/20 animate-fade-in">
            <CardHeader className="pb-0 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/15">
                  <Zap className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                </div>
                <span className="text-sm font-semibold">Generated SQL</span>
                <div className="flex gap-1.5">
                  {generated.tables_used.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </div>
              <Button onClick={() => handleExecute()} disabled={isExecuting} size="sm" className="gap-2">
                {isExecuting ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                {isExecuting ? "Running..." : "Execute"}
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <textarea
                value={editedSQL}
                onChange={(e) => setEditedSQL(e.target.value)}
                className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-4 sql-code text-emerald-400 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] resize-none"
                rows={Math.min(editedSQL.split("\n").length + 1, 14)}
              />
              {generated.explanation && (
                <div className="flex gap-2.5 p-3.5 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))]">
                  <Lightbulb className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{generated.explanation}</p>
                </div>
              )}
              {generated.optimized_sql && generated.optimized_sql !== generated.generated_sql && (
                <div className="p-3.5 rounded-xl bg-yellow-400/5 border border-yellow-400/20">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-yellow-400 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" /> AI Optimization Available
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{generated.optimization_notes}</p>
                    </div>
                    <Button variant="warning" size="sm" className="flex-shrink-0 text-xs border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10" onClick={() => { setEditedSQL(generated.optimized_sql!); toast.success("Optimized SQL applied"); }}>
                      Apply
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-0 flex flex-row items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {(["table", "chart", "sql"] as Tab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                        tab === t
                          ? "bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/20"
                          : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"
                      )}
                    >
                      {t === "table" && <Table2 className="w-3.5 h-3.5" />}
                      {t === "chart" && <BarChart2 className="w-3.5 h-3.5" />}
                      {t === "sql"   && <Code2 className="w-3.5 h-3.5" />}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">{result.row_count} rows</Badge>
                <Badge variant="secondary">{formatMs(result.execution_time_ms)}</Badge>
                {result.suggested_chart && result.suggested_chart !== "table" && (
                  <Badge variant="default">{result.suggested_chart} chart</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {tab === "table" && (
                <div className="overflow-auto max-h-[420px] rounded-xl border border-[hsl(var(--border))]">
                  <table className="w-full text-sm text-left">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[hsl(var(--secondary))] border-b border-[hsl(var(--border))]">
                        {result.columns.map((col) => (
                          <th key={col} className="px-4 py-2.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className={cn("border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/50 transition-colors", i % 2 === 0 ? "" : "bg-[hsl(var(--secondary))]/20")}>
                          {(row as unknown[]).map((cell, j) => (
                            <td key={j} className="px-4 py-2.5 text-[hsl(var(--foreground))] whitespace-nowrap max-w-[200px] truncate">
                              {cell == null ? <span className="text-[hsl(var(--muted-foreground))]/40 italic text-xs">NULL</span> : String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === "chart" && (
                <ResultChart columns={result.columns} rows={result.rows} chartType={result.suggested_chart || "bar"} />
              )}
              {tab === "sql" && (
                <pre className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-4 sql-code text-emerald-400 dark:text-emerald-300 overflow-auto max-h-80">{editedSQL}</pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
