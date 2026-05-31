"use client";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { csvApi } from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload, Table2, FileText, Database, Download,
  Trash2, ChevronDown, ChevronUp, Eye, Cloud, CloudOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CSVTable {
  id: number;
  original_filename: string;
  table_name: string;
  row_count: number;
  file_size_bytes: number | null;
  cloudinary_url: string | null;
  schema_info: { name: string; type: string }[] | null;
  created_at: string;
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CSVPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: tables = [], isLoading } = useQuery<CSVTable[]>({
    queryKey: ["csv-tables"],
    queryFn: () => csvApi.tables().then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: csvApi.upload,
    onSuccess: (data) => {
      const stored = data.data.cloudinary_url ? " · Saved to Cloudinary" : "";
      toast.success(`Imported ${data.data.row_count?.toLocaleString()} rows into "${data.data.table_name}"${stored}`);
      qc.invalidateQueries({ queryKey: ["csv-tables"] });
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Upload failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: csvApi.deleteTable,
    onSuccess: () => {
      toast.success("Table and file deleted");
      qc.invalidateQueries({ queryKey: ["csv-tables"] });
      setExpandedId(null);
    },
    onError: () => toast.error("Delete failed"),
  });

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) { toast.error("Only CSV files are supported"); return; }
    uploadMutation.mutate(file);
  }

  const uploadedCount = tables.length;
  const cloudinaryCount = tables.filter((t) => t.cloudinary_url).length;

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CSV Upload</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">Upload CSV files and query them with AI</p>
          </div>
          {uploadedCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{uploadedCount} table{uploadedCount > 1 ? "s" : ""}</Badge>
              {cloudinaryCount > 0 && (
                <Badge variant="default" className="gap-1">
                  <Cloud className="w-3 h-3" /> {cloudinaryCount} stored
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
            isDragging
              ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 scale-[1.01]"
              : "border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]/50 hover:bg-[hsl(var(--secondary))]/30"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {uploadMutation.isPending ? (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-2xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
                <div className="w-6 h-6 rounded-full border-2 border-[hsl(var(--primary))]/30 border-t-[hsl(var(--primary))] animate-spin" />
              </div>
              <div>
                <p className="text-[hsl(var(--primary))] font-medium">Processing CSV...</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">Creating table, importing rows, and uploading to Cloudinary</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={cn("p-4 rounded-2xl border transition-all",
                isDragging ? "bg-[hsl(var(--primary))]/15 border-[hsl(var(--primary))]/30" : "bg-[hsl(var(--secondary))] border-[hsl(var(--border))]"
              )}>
                <Upload className={cn("w-6 h-6 transition-colors", isDragging ? "text-[hsl(var(--primary))]" : "text-[hsl(var(--muted-foreground))]")} />
              </div>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">
                  {isDragging ? "Drop it here" : "Drop a CSV file or click to browse"}
                </p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Max 50MB · CSV format · Saved to Cloudinary</p>
              </div>
            </div>
          )}
        </div>

        {/* How it works */}
        <Card className="bg-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/15">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-[hsl(var(--primary))]" />
              How it works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            {[
              ["1", "CSV is parsed → a PostgreSQL table is created automatically"],
              ["2", "Original file is uploaded to Cloudinary for permanent storage"],
              ["3", "Go to AI Query → ask questions referencing the table name"],
            ].map(([n, text]) => (
              <div key={n} className="flex items-center gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] text-xs flex items-center justify-center font-bold">{n}</span>
                {text}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* File list */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            Uploaded Files
            <span className="text-xs text-[hsl(var(--muted-foreground))] font-normal">({uploadedCount})</span>
          </h2>

          {isLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-[hsl(var(--secondary))] animate-pulse" />)}</div>
          ) : tables.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-10">
                <FileText className="w-8 h-8 text-[hsl(var(--muted-foreground))]/30 mb-2" />
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No files uploaded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tables.map((t) => (
                <Card key={t.id} className={cn("overflow-hidden transition-all duration-200",
                  expandedId === t.id ? "border-[hsl(var(--primary))]/20" : "hover:border-[hsl(var(--border))]/80"
                )}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[hsl(var(--secondary))]/30 transition-colors"
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  >
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/15 flex-shrink-0">
                      <Table2 className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{t.original_filename}</p>
                        {t.cloudinary_url
                          ? <Badge variant="default" className="gap-1 text-[10px] flex-shrink-0"><Cloud className="w-2.5 h-2.5" /> Stored</Badge>
                          : <Badge variant="secondary" className="gap-1 text-[10px] flex-shrink-0"><CloudOff className="w-2.5 h-2.5" /> Local only</Badge>
                        }
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                        <code className="text-purple-400 font-mono">{t.table_name}</code>
                        {" · "}{t.row_count?.toLocaleString()} rows
                        {" · "}{formatBytes(t.file_size_bytes)}
                        {" · "}{new Date(t.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {t.cloudinary_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Download original CSV">
                          <a href={t.cloudinary_url} download={t.original_filename} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 hover:text-red-400 hover:bg-red-400/10"
                        onClick={() => { if (confirm(`Delete table "${t.table_name}" and its file?`)) deleteMutation.mutate(t.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      {expandedId === t.id
                        ? <ChevronUp className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                        : <ChevronDown className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />}
                    </div>
                  </div>

                  {/* Expanded schema */}
                  {expandedId === t.id && (
                    <div className="border-t border-[hsl(var(--border))] px-5 py-4 bg-[hsl(var(--secondary))]/20 animate-fade-in space-y-3">
                      <p className="text-[10px] font-bold text-[hsl(var(--muted-foreground))] uppercase tracking-widest">Schema ({t.schema_info?.length ?? 0} columns)</p>
                      {t.schema_info && t.schema_info.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {t.schema_info.map((col) => (
                            <div key={col.name} className="flex items-center justify-between bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2">
                              <code className="text-xs text-[hsl(var(--foreground))] font-mono truncate">{col.name}</code>
                              <Badge variant="secondary" className="text-[9px] ml-2 flex-shrink-0">{col.type}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">No schema info available</p>
                      )}

                      {t.cloudinary_url && (
                        <div className="flex items-center gap-2 pt-1">
                          <Cloud className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
                          <a href={t.cloudinary_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[hsl(var(--primary))] hover:underline truncate">
                            {t.cloudinary_url}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
