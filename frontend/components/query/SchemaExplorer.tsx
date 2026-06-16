"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { connectionsApi } from "@/lib/api";
import { ChevronRight, ChevronDown, Database, Table2, Key } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
  primary_key?: boolean;
  nullable?: boolean;
}

interface TableSchema {
  table_name: string;
  columns: Column[];
  row_count?: number;
}

interface SchemaExplorerProps {
  connectionId: number | null;
  onInsertTable?: (tableName: string) => void;
  onInsertColumn?: (col: string) => void;
}

export default function SchemaExplorer({ connectionId, onInsertTable, onInsertColumn }: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["schema", connectionId],
    queryFn: () => connectionsApi.schema(connectionId!).then((r) => r.data),
    enabled: !!connectionId,
  });

  const tables: TableSchema[] = data?.tables ?? [];

  function toggleTable(name: string) {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  if (!connectionId) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-[hsl(var(--muted-foreground))] text-sm gap-2">
        <Database className="w-6 h-6 opacity-40" />
        <span>Select a connection to explore schema</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-[hsl(var(--muted-foreground))] text-sm">
        Loading schema...
      </div>
    );
  }

  return (
    <div className="space-y-0.5 text-sm">
      {tables.map((table) => {
        const isOpen = expandedTables.has(table.table_name);
        return (
          <div key={table.table_name}>
            <button
              onClick={() => toggleTable(table.table_name)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] text-left transition-colors group"
            >
              {isOpen ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
              <Table2 className="w-3.5 h-3.5 text-[hsl(var(--primary))] flex-shrink-0" />
              <span
                className="font-medium truncate flex-1 cursor-pointer group-hover:text-[hsl(var(--primary))]"
                onClick={(e) => { e.stopPropagation(); onInsertTable?.(table.table_name); }}
                title={`Click to insert "${table.table_name}"`}
              >
                {table.table_name}
              </span>
              {table.row_count != null && (
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex-shrink-0">
                  {table.row_count.toLocaleString()} rows
                </span>
              )}
            </button>
            {isOpen && (
              <div className="ml-5 border-l border-[hsl(var(--border))] pl-2 mb-1 space-y-0.5">
                {table.columns.map((col) => (
                  <button
                    key={col.name}
                    onClick={() => onInsertColumn?.(col.name)}
                    title={`Click to insert "${col.name}"`}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[hsl(var(--secondary))] text-left transition-colors"
                  >
                    {col.primary_key
                      ? <Key className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      : <span className="w-3 h-3 flex-shrink-0" />
                    }
                    <span className={cn("truncate flex-1", col.primary_key && "text-yellow-400 font-medium")}>
                      {col.name}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono flex-shrink-0">
                      {col.type}
                    </span>
                    {!col.nullable && (
                      <span className="text-[9px] text-red-400/70 flex-shrink-0">NN</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {tables.length === 0 && (
        <p className="text-center text-[hsl(var(--muted-foreground))] text-xs py-4">No tables found</p>
      )}
    </div>
  );
}
