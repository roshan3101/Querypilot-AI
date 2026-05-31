"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { connectionsApi } from "@/lib/api";
import { parseDbUrl } from "@/lib/parseDbUrl";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Server, TestTube, X, Link2, FormInput, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conn { id: number; name: string; host: string; port: number; database: string; username: string }

const emptyForm = { name: "", host: "localhost", port: 5432, database: "", username: "postgres", password: "" };

export default function ConnectionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"manual" | "url">("manual");
  const [form, setForm] = useState(emptyForm);
  const [dbUrl, setDbUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  const { data: connections = [], isLoading } = useQuery<Conn[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: connectionsApi.create,
    onSuccess: () => {
      toast.success("Connection added!");
      qc.invalidateQueries({ queryKey: ["connections"] });
      setShowForm(false);
      setForm(emptyForm);
      setDbUrl("");
      setUrlError("");
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to connect");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: connectionsApi.delete,
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["connections"] }); },
  });

  const testMutation = useMutation({
    mutationFn: connectionsApi.test,
    onSuccess: (data) => data.data.status === "ok" ? toast.success("Connection is healthy!") : toast.error("Connection test failed"),
    onError: () => toast.error("Connection test failed"),
  });

  function handleUrlParse(url: string) {
    setDbUrl(url);
    setUrlError("");
    if (!url.trim()) return;
    const parsed = parseDbUrl(url);
    if (!parsed) return;
    if (parsed.error) { setUrlError(parsed.error); return; }
    setForm((prev) => ({
      ...prev,
      host:     parsed.host     || prev.host,
      port:     parsed.port     || prev.port,
      database: parsed.database || prev.database,
      username: parsed.username || prev.username,
      password: parsed.password || prev.password,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Connection name is required"); return; }
    createMutation.mutate(form);
  }

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">Connect your PostgreSQL databases</p>
          </div>
          <Button onClick={() => { setShowForm(!showForm); setForm(emptyForm); setDbUrl(""); setUrlError(""); }} variant={showForm ? "outline" : "default"} className="gap-2">
            {showForm ? <><X className="w-4 h-4" /> Cancel</> : <><Plus className="w-4 h-4" /> Add Connection</>}
          </Button>
        </div>

        {showForm && (
          <Card className="border-[hsl(var(--primary))]/20 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">New Connection</CardTitle>
              <CardDescription>Tested live before saving</CardDescription>
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-[hsl(var(--secondary))] rounded-xl w-fit mt-2">
                <button
                  type="button"
                  onClick={() => setMode("manual")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    mode === "manual" ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}
                >
                  <FormInput className="w-3.5 h-3.5" /> Manual fields
                </button>
                <button
                  type="button"
                  onClick={() => setMode("url")}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    mode === "url" ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]")}
                >
                  <Link2 className="w-3.5 h-3.5" /> Connection URL
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* URL mode — parse and fill */}
                {mode === "url" && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Database URL</label>
                    <Input
                      value={dbUrl}
                      onChange={(e) => handleUrlParse(e.target.value)}
                      placeholder="postgresql://user:password@host:5432/database"
                      className={urlError ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {urlError ? (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {urlError}
                      </p>
                    ) : dbUrl && !urlError && form.host !== "localhost" ? (
                      <p className="text-xs text-emerald-400">✓ URL parsed — review fields below</p>
                    ) : (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        Supports: <code className="text-[10px]">postgresql://</code>, <code className="text-[10px]">postgres://</code>, <code className="text-[10px]">postgresql+asyncpg://</code>
                      </p>
                    )}
                  </div>
                )}

                {/* Always-visible: Connection name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Connection Name <span className="text-red-400">*</span></label>
                  <Input
                    required value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Production DB, Staging, Analytics..."
                  />
                </div>

                {/* Fields — shown in both modes (pre-filled from URL in url mode) */}
                <div className={cn("grid gap-3 transition-all", mode === "url" && !dbUrl ? "opacity-50 pointer-events-none" : "")}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1">
                        Host
                        {mode === "url" && form.host !== "localhost" && <Badge variant="success" className="text-[9px] py-0">auto</Badge>}
                      </label>
                      <Input required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="db.render.com" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1">
                        Port
                        {mode === "url" && form.host !== "localhost" && <Badge variant="success" className="text-[9px] py-0">auto</Badge>}
                      </label>
                      <Input type="number" required value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1">
                        Database
                        {mode === "url" && form.database && <Badge variant="success" className="text-[9px] py-0">auto</Badge>}
                      </label>
                      <Input required value={form.database} onChange={(e) => setForm({ ...form, database: e.target.value })} placeholder="mydb" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium flex items-center gap-1">
                        Username
                        {mode === "url" && form.username !== "postgres" && <Badge variant="success" className="text-[9px] py-0">auto</Badge>}
                      </label>
                      <Input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Password
                      {mode === "url" && form.password && <Badge variant="success" className="text-[9px] py-0">auto-filled</Badge>}
                    </label>
                    <Input
                      type="password" required value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={mode === "url" && form.password ? "••••••••" : "Enter password"}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                    {createMutation.isPending && <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
                    {createMutation.isPending ? "Testing & Saving..." : "Save Connection"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-[hsl(var(--secondary))] animate-pulse" />)}</div>
          ) : connections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-2xl bg-[hsl(var(--secondary))] mb-4">
                  <Server className="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
                </div>
                <p className="font-semibold">No connections yet</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1 max-w-xs">Add your first PostgreSQL connection to start querying</p>
                <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4" /> Add Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            connections.map((conn) => (
              <Card key={conn.id} className="hover:border-[hsl(var(--primary))]/20 transition-all duration-200">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/15">
                      <Server className="w-4 h-4 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{conn.name}</p>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 font-mono">
                        {conn.username}@{conn.host}:{conn.port}/{conn.database}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="glow" size="sm" onClick={() => testMutation.mutate(conn.id)} disabled={testMutation.isPending} className="gap-1.5 text-xs">
                      <TestTube className="w-3 h-3" /> Test
                    </Button>
                    <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(conn.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
}
