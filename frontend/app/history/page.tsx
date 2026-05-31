"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queriesApi } from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMs } from "@/lib/utils";
import { Trash2, RotateCcw, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Rows } from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface HistoryItem {
  id: number; natural_language: string; generated_sql: string | null;
  explanation: string | null; execution_time_ms: number | null;
  row_count: number | null; is_successful: boolean;
  error_message: string | null; tables_used: string[] | null; created_at: string;
}

export default function HistoryPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: history = [], isLoading } = useQuery<HistoryItem[]>({
    queryKey: ["history"],
    queryFn: () => queriesApi.history(100).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: queriesApi.deleteHistory,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["history"] }); },
  });

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Query History</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">{history.length} saved queries</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-[hsl(var(--secondary))] animate-pulse" />)}
          </div>
        ) : history.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Clock className="w-10 h-10 text-[hsl(var(--muted-foreground))]/30 mb-3" />
              <p className="font-semibold">No history yet</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Your queries will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <Card key={item.id} className={cn("overflow-hidden transition-all duration-200",
                expandedId === item.id ? "border-[hsl(var(--primary))]/20" : "hover:border-[hsl(var(--border))]/80"
              )}>
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[hsl(var(--secondary))]/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                  <div className="flex-shrink-0">
                    {item.is_successful
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{item.natural_language}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.execution_time_ms != null && (
                        <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                          <Clock className="w-2.5 h-2.5" />{formatMs(item.execution_time_ms)}
                        </span>
                      )}
                      {item.row_count != null && (
                        <span className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                          <Rows className="w-2.5 h-2.5" />{item.row_count} rows
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.tables_used?.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] hidden sm:flex">{t}</Badge>
                    ))}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); router.push(`/query`); }} title="Re-run">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400 hover:bg-red-400/10" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(item.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    {expandedId === item.id ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
                  </div>
                </div>

                {expandedId === item.id && (
                  <div className="border-t border-[hsl(var(--border))] px-5 py-4 space-y-4 bg-[hsl(var(--secondary))]/20 animate-fade-in">
                    {item.generated_sql && (
                      <div>
                        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">SQL</p>
                        <pre className="bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-xl p-4 sql-code text-emerald-400 dark:text-emerald-300 text-xs overflow-auto max-h-48">{item.generated_sql}</pre>
                      </div>
                    )}
                    {item.explanation && (
                      <div>
                        <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Explanation</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">{item.explanation}</p>
                      </div>
                    )}
                    {item.error_message && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                        <p className="text-xs text-red-400">{item.error_message}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
