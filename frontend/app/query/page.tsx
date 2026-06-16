"use client";
import { useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { connectionsApi, queriesApi, streamGenerateSql } from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import ResultChart from "@/components/query/ResultChart";
import SchemaExplorer from "@/components/query/SchemaExplorer";
import SqlEditor from "@/components/query/SqlEditor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Send, Play, Sparkles, BarChart2, Table2, Code2, Lightbulb, Zap,
  ChevronRight, Download, BookmarkPlus, Bookmark, X, Database,
  MessageSquarePlus, RotateCcw, Coins, PanelLeft,
} from "lucide-react";
import { formatMs, cn } from "@/lib/utils";

type Tab = "table" | "chart" | "sql";
type ChartOverride = "bar" | "line" | "pie" | "table";

const EXAMPLES = [
  "Show all tables with their row counts",
  "Top 10 most recent records",
  "Monthly counts for this year",
  "Records created in the last 7 days",
];

interface GeneratedResult {
  generated_sql: string;
  explanation: string;
  optimized_sql?: string | null;
  optimization_notes?: string | null;
  tables_used: string[];
  token_usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; estimated_cost_usd: number } | null;
}

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
  suggested_chart: string | null;
}

interface SavedQuery {
  id: number;
  name: string;
  description?: string;
  sql: string;
}

export default function QueryPage() {
  const qc = useQueryClient();
  const [connectionId, setConnectionId] = useState<string>("");
  const [nl, setNl] = useState("");
  const [generated, setGenerated] = useState<GeneratedResult | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [editedSQL, setEditedSQL] = useState("");
  const [streamingSQL, setStreamingSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tab, setTab] = useState<Tab>("table");
  const [chartOverride, setChartOverride] = useState<ChartOverride | null>(null);
  const [showSchema, setShowSchema] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [saveDialogSQL, setSaveDialogSQL] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [followUp, setFollowUp] = useState<{ question: string; sql: string } | null>(null);
  const nlRef = useRef<HTMLTextAreaElement>(null);

  const { data: connections = [] } = useQuery({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data),
  });

  const { data: savedQueries = [], refetch: refetchSaved } = useQuery<SavedQuery[]>({
    queryKey: ["saved-queries"],
    queryFn: () => queriesApi.listSaved().then((r) => r.data),
  });

  const connId = connectionId ? Number(connectionId) : null;

  async function handleGenerate() {
    if (!connectionId || !nl.trim()) {
      toast.error("Select a connection and enter a question");
      return;
    }
    setIsGenerating(true);
    setGenerated(null);
    setResult(null);
    setStreamingSQL("");
    setChartOverride(null);

    try {
      let accumulated = "";
      const stream = streamGenerateSql({
        connection_id: Number(connectionId),
        natural_language: nl,
        previous_question: followUp?.question,
        previous_sql: followUp?.sql,
      });

      for await (const event of stream) {
        if (event.type === "token" && event.content) {
          accumulated += event.content;
          // Try to extract SQL from accumulated JSON for live preview
          const sqlMatch = accumulated.match(/"sql"\s*:\s*"([\s\S]*?)(?:"|(?=\n\s*"))/);
          if (sqlMatch) {
            setStreamingSQL(sqlMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t"));
          }
        } else if (event.type === "done" && event.data) {
          const data = event.data as Record<string, unknown>;
          const genResult: GeneratedResult = {
            generated_sql: data.sql as string || "",
            explanation: data.explanation as string || "",
            tables_used: (data.tables_used as string[]) || [],
            optimized_sql: data.optimized_sql as string | null,
            optimization_notes: data.optimization_notes as string | null,
            token_usage: data.token_usage as GeneratedResult["token_usage"],
          };
          setGenerated(genResult);
          setEditedSQL(genResult.generated_sql);
          setStreamingSQL("");
          toast.success("SQL generated!");
        } else if (event.type === "error") {
          throw new Error(event.message || "Generation failed");
        }
      }
    } catch (err: unknown) {
      // Fallback to non-streaming if SSE fails
      try {
        const res = await queriesApi.generate({
          connection_id: Number(connectionId),
          natural_language: nl,
          previous_question: followUp?.question,
          previous_sql: followUp?.sql,
        });
        setGenerated(res.data);
        setEditedSQL(res.data.generated_sql);
        setStreamingSQL("");
        toast.success("SQL generated!");
      } catch (fallbackErr: unknown) {
        const msg = (fallbackErr as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Generation failed";
        toast.error(msg);
      }
      void err;
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExecute(sql?: string) {
    if (!connectionId) return;
    const sqlToRun = sql ?? editedSQL;
    setIsExecuting(true);
    try {
      const res = await queriesApi.execute({
        connection_id: Number(connectionId),
        sql: sqlToRun,
        history_id: historyId ?? undefined,
      });
      setResult(res.data);
      setChartOverride(null);
      setTab(res.data.suggested_chart && res.data.suggested_chart !== "table" ? "chart" : "table");
      toast.success(`${res.data.row_count} rows · ${formatMs(res.data.execution_time_ms)}`);
    } catch (err: unknown) {
      toast.error(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Execution failed"
      );
    } finally {
      setIsExecuting(false);
    }
  }

  function handleExportCSV() {
    if (!result) return;
    const rows = [result.columns.join(","), ...result.rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSaveQuery() {
    if (!saveName.trim() || !saveDialogSQL) return;
    try {
      await queriesApi.saveQuery({ name: saveName.trim(), sql: saveDialogSQL });
      await refetchSaved();
      setSaveDialogSQL(null);
      setSaveName("");
      toast.success("Query saved!");
    } catch {
      toast.error("Failed to save query");
    }
  }

  async function handleDeleteSaved(id: number) {
    try {
      await queriesApi.deleteSaved(id);
      await refetchSaved();
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
    }
  }

  function startFollowUp() {
    if (!generated) return;
    setFollowUp({ question: nl, sql: generated.generated_sql });
    setNl("");
    setGenerated(null);
    setResult(null);
    nlRef.current?.focus();
    toast.info("Follow-up mode — ask a refinement question");
  }

  function clearFollowUp() {
    setFollowUp(null);
    setNl("");
    setGenerated(null);
    setResult(null);
  }

  const insertAtCursor = useCallback((text: string) => {
    setNl((prev) => prev ? `${prev} ${text}` : text);
    nlRef.current?.focus();
  }, []);

  const activeChart = chartOverride ?? (result?.suggested_chart as ChartOverride | null) ?? "bar";

  return (
    <AppLayout>
      <div className="flex gap-4 h-full">
        {/* Schema Explorer Sidebar */}
        {showSchema && (
          <div className="w-64 flex-shrink-0">
            <Card className="h-full overflow-hidden flex flex-col">
              <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold">Schema</span>
                </div>
                <button onClick={() => setShowSchema(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </CardHeader>
              <CardContent className="px-2 pb-4 overflow-y-auto flex-1">
                <SchemaExplorer
                  connectionId={connId}
                  onInsertTable={(t) => insertAtCursor(t)}
                  onInsertColumn={(c) => insertAtCursor(c)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Query</h1>
              <p className="text-[hsl(var(--muted-foreground))] mt-1">Ask your database anything in plain English</p>
            </div>
            <div className="flex items-center gap-2">
              {!showSchema && (
                <Button variant="outline" size="sm" onClick={() => setShowSchema(true)} className="gap-1.5">
                  <PanelLeft className="w-3.5 h-3.5" /> Schema
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSaved((v) => !v)} className="gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                Saved {savedQueries.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{savedQueries.length}</Badge>}
              </Button>
            </div>
          </div>

          {/* Saved queries panel */}
          {showSaved && (
            <Card className="animate-fade-in">
              <CardHeader className="pb-2 pt-4 px-4">
                <span className="text-sm font-semibold">Saved Queries</span>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 max-h-56 overflow-y-auto">
                {savedQueries.length === 0 && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">No saved queries yet. Generate SQL and save it with the bookmark icon.</p>
                )}
                {savedQueries.map((sq) => (
                  <div key={sq.id} className="flex items-start gap-2 p-2.5 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sq.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono truncate mt-0.5">{sq.sql}</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditedSQL(sq.sql); setTab("sql"); setShowSaved(false); toast.success(`Loaded: ${sq.name}`); }}
                        className="text-xs px-2 py-1 rounded bg-[hsl(var(--primary))]/10 hover:bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] transition-colors"
                      >
                        Load
                      </button>
                      <button onClick={() => handleDeleteSaved(sq.id)} className="text-xs px-2 py-1 rounded hover:bg-red-500/10 text-[hsl(var(--muted-foreground))] hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Save dialog */}
          {saveDialogSQL && (
            <Card className="border-[hsl(var(--primary))]/30 animate-fade-in">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Save query as</p>
                <div className="flex gap-2">
                  <input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveQuery(); if (e.key === "Escape") setSaveDialogSQL(null); }}
                    placeholder="Query name..."
                    className="flex-1 text-sm border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveQuery} disabled={!saveName.trim()}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setSaveDialogSQL(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up banner */}
          {followUp && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 text-sm">
              <MessageSquarePlus className="w-4 h-4 text-[hsl(var(--primary))] flex-shrink-0" />
              <span className="text-[hsl(var(--muted-foreground))] flex-1">Follow-up on: <span className="text-[hsl(var(--foreground))] font-medium">{followUp.question}</span></span>
              <button onClick={clearFollowUp} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input card */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[hsl(var(--primary))]/5 rounded-full blur-3xl pointer-events-none translate-x-16 -translate-y-16" />
            <CardContent className="p-6 space-y-4 relative z-10">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Database Connection</label>
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
                <label className="text-sm font-medium">
                  {followUp ? "Follow-up question" : "Ask a question"}
                </label>
                <div className="relative">
                  <Textarea
                    ref={nlRef}
                    value={nl}
                    onChange={(e) => setNl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    rows={3}
                    className="pr-14"
                    placeholder={followUp ? "Refine or expand the previous query..." : "e.g. Show monthly revenue for this year, top 10 customers by purchase amount..."}
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !connectionId || !nl.trim()}
                    className="absolute right-3 bottom-3 p-2 bg-[hsl(var(--primary))] hover:opacity-90 disabled:opacity-30 rounded-lg transition-all"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">Enter to generate · Shift+Enter for newline</p>
              </div>

              {!generated && !streamingSQL && (
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

          {/* Streaming SQL preview */}
          {streamingSQL && !generated && (
            <Card className="border-[hsl(var(--primary))]/20 animate-fade-in">
              <CardHeader className="pb-0 flex flex-row items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[hsl(var(--primary))] animate-pulse" />
                <span className="text-sm font-semibold">Generating...</span>
              </CardHeader>
              <CardContent className="pt-3">
                <SqlEditor value={streamingSQL} onChange={() => {}} readOnly minHeight="80px" maxHeight="200px" />
              </CardContent>
            </Card>
          )}

          {/* Generated SQL */}
          {generated && (
            <Card className="border-[hsl(var(--primary))]/20 animate-fade-in">
              <CardHeader className="pb-0 flex flex-row items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[hsl(var(--primary))]/15">
                    <Zap className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                  </div>
                  <span className="text-sm font-semibold">Generated SQL</span>
                  {generated.tables_used.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                  {generated.token_usage && (
                    <span className="flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <Coins className="w-3 h-3" />
                      {generated.token_usage.total_tokens} tokens
                      {generated.token_usage.estimated_cost_usd > 0 && (
                        <span>(~${generated.token_usage.estimated_cost_usd.toFixed(4)})</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSaveDialogSQL(editedSQL); setSaveName(""); }}
                    title="Save query"
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  </button>
                  {result && (
                    <button
                      onClick={startFollowUp}
                      title="Ask a follow-up question"
                      className="p-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Button onClick={() => handleExecute()} disabled={isExecuting} size="sm" className="gap-2">
                    {isExecuting
                      ? <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      : <Play className="w-3.5 h-3.5" />}
                    {isExecuting ? "Running..." : "Execute"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <SqlEditor value={editedSQL} onChange={setEditedSQL} minHeight="120px" maxHeight="280px" />

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
                      <Button
                        variant="warning"
                        size="sm"
                        className="flex-shrink-0 text-xs border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                        onClick={() => { setEditedSQL(generated.optimized_sql!); toast.success("Optimized SQL applied"); }}
                      >
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
                        {t === "sql" && <Code2 className="w-3.5 h-3.5" />}
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Chart type override — visible when on chart tab */}
                  {tab === "chart" && (
                    <div className="flex gap-1">
                      {(["bar", "line", "pie"] as ChartOverride[]).map((ct) => (
                        <button
                          key={ct}
                          onClick={() => setChartOverride(ct)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors border",
                            activeChart === ct
                              ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/30 text-[hsl(var(--primary))]"
                              : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
                          )}
                        >
                          {ct}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success">{result.row_count} rows</Badge>
                  <Badge variant="secondary">{formatMs(result.execution_time_ms)}</Badge>
                  <button
                    onClick={handleExportCSV}
                    title="Download CSV"
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
                  >
                    <Download className="w-3 h-3" /> CSV
                  </button>
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
                          <tr key={i} className={cn("border-b border-[hsl(var(--border))]/50 hover:bg-[hsl(var(--secondary))]/50 transition-colors", i % 2 !== 0 && "bg-[hsl(var(--secondary))]/20")}>
                            {(row as unknown[]).map((cell, j) => (
                              <td key={j} className="px-4 py-2.5 whitespace-nowrap max-w-[200px] truncate">
                                {cell == null
                                  ? <span className="text-[hsl(var(--muted-foreground))]/40 italic text-xs">NULL</span>
                                  : String(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === "chart" && (
                  <ResultChart
                    columns={result.columns}
                    rows={result.rows}
                    chartType={activeChart}
                  />
                )}

                {tab === "sql" && (
                  <SqlEditor value={editedSQL} onChange={setEditedSQL} minHeight="120px" maxHeight="320px" />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
