"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import AppLayout from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMs, formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";
import { Database, MessageSquare, CheckCircle, XCircle, Clock, TrendingUp, Table2, Zap } from "lucide-react";

function StatCard({ label, value, icon: Icon, variant = "default", delta }: {
  label: string; value: string | number; icon: React.ElementType;
  variant?: "default" | "success" | "error" | "warning" | "purple";
  delta?: string;
}) {
  const colors = {
    default:  "text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))]/15",
    success:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/15",
    error:    "text-red-400 bg-red-400/10 border-red-400/15",
    warning:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/15",
    purple:   "text-purple-400 bg-purple-400/10 border-purple-400/15",
  };
  return (
    <Card className="relative overflow-hidden hover:border-[hsl(var(--primary))]/30 transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">{label}</p>
            <p className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">{value}</p>
            {delta && <p className="text-xs text-emerald-400 mt-1">{delta}</p>}
          </div>
          <div className={`p-2.5 rounded-xl border ${colors[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const chartTooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "12px",
    fontSize: "12px",
    color: "hsl(var(--foreground))",
  },
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-[hsl(var(--muted-foreground))]">
            <div className="h-5 w-5 rounded-full border-2 border-[hsl(var(--border))] border-t-[hsl(var(--primary))] animate-spin" />
            Loading analytics...
          </div>
        </div>
      </AppLayout>
    );
  }

  const stats = data || {};
  const chartData = (stats.queries_by_day || []).slice().reverse();
  const successRate = stats.total_queries ? Math.round((stats.successful_queries / stats.total_queries) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] tracking-tight">
              Dashboard
            </h1>
            <p className="text-[hsl(var(--muted-foreground))] mt-1">Monitor your query analytics and usage</p>
          </div>
          <Badge variant="default" className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Queries"  value={formatNumber(stats.total_queries)}       icon={MessageSquare} variant="default" />
          <StatCard label="Successful"     value={formatNumber(stats.successful_queries)}  icon={CheckCircle}   variant="success" />
          <StatCard label="Failed"         value={formatNumber(stats.failed_queries)}      icon={XCircle}       variant="error" />
          <StatCard label="Avg. Time"      value={formatMs(stats.avg_execution_time_ms)}   icon={Clock}         variant="warning" />
          <StatCard label="Connections"    value={formatNumber(stats.total_connections)}   icon={Database}      variant="purple" />
          <StatCard label="Success Rate"   value={`${successRate}%`}                       icon={TrendingUp}     variant={successRate >= 80 ? "success" : "warning"} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Query Activity</CardTitle>
                <Badge variant="secondary" className="text-xs">Last 30 days</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(262 83% 65%)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(262 83% 65%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip {...chartTooltipStyle} />
                    <Line type="monotone" dataKey="count" stroke="hsl(262 83% 65%)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "hsl(262 83% 65%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
                  <Zap className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">Run your first query to see activity</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Tables</CardTitle>
                <Badge variant="secondary" className="text-xs">By query count</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {(stats.most_queried_tables || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={(stats.most_queried_tables || []).slice(0, 7)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="table" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} width={72} />
                    <Tooltip {...chartTooltipStyle} />
                    <Bar dataKey="count" fill="hsl(262 83% 65%)" radius={[0, 6, 6, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
                  <Table2 className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No table usage data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick start banner */}
        {stats.total_queries === 0 && (
          <Card className="bg-[hsl(var(--primary))]/5 border-[hsl(var(--primary))]/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20">
                  <Zap className="w-6 h-6 text-[hsl(var(--primary))]" />
                </div>
                <div>
                  <p className="font-semibold text-[hsl(var(--foreground))]">Get started with QueryPilot AI</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Add a database connection, then ask questions in plain English.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
