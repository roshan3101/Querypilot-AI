"use client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

const COLORS = ["#7c3aed", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--popover, 240 10% 4%))",
    border: "1px solid hsl(var(--border, 240 6% 14%))",
    borderRadius: "12px",
    fontSize: "12px",
    color: "hsl(var(--foreground, 0 0% 95%))",
  },
};

interface ResultChartProps {
  columns: string[];
  rows: unknown[][];
  chartType: string;
}

export default function ResultChart({ columns, rows, chartType }: ResultChartProps) {
  if (!rows.length || !columns.length) return null;

  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });

  const labelKey = columns[0];
  const valueKeys = columns.slice(1).filter((c) => {
    const s = data[0]?.[c];
    return typeof s === "number" || !isNaN(Number(s));
  });

  if (!valueKeys.length) {
    return (
      <div className="h-48 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
        No numeric columns to chart
      </div>
    );
  }

  const tickStyle = { fill: "hsl(var(--muted-foreground))" as string, fontSize: 11 };

  if (chartType === "pie" && valueKeys.length === 1) {
    const pieData = data.slice(0, 10).map((d) => ({
      name: String(d[labelKey]),
      value: Number(d[valueKeys[0]]),
    }));
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
            labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
          >
            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={labelKey} tick={tickStyle} tickLine={false} axisLine={false} />
          <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
          {valueKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false}
              activeDot={{ r: 4, fill: COLORS[i % COLORS.length] }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={labelKey} tick={tickStyle} tickLine={false} axisLine={false} />
        <YAxis tick={tickStyle} tickLine={false} axisLine={false} width={40} />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        {valueKeys.map((key, i) => (
          <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} opacity={0.9} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
