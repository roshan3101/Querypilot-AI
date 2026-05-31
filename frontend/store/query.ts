import { create } from "zustand";

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  row_count: number;
  execution_time_ms: number;
  suggested_chart: string | null;
}

export interface GeneratedSQL {
  generated_sql: string;
  explanation: string;
  tables_used: string[];
  optimized_sql: string | null;
  optimization_notes: string | null;
}

interface QueryState {
  selectedConnectionId: number | null;
  naturalLanguage: string;
  generatedSQL: GeneratedSQL | null;
  queryResult: QueryResult | null;
  isGenerating: boolean;
  isExecuting: boolean;
  error: string | null;
  historyId: number | null;

  setConnection: (id: number | null) => void;
  setNaturalLanguage: (nl: string) => void;
  setGeneratedSQL: (sql: GeneratedSQL | null) => void;
  setQueryResult: (result: QueryResult | null) => void;
  setGenerating: (v: boolean) => void;
  setExecuting: (v: boolean) => void;
  setError: (e: string | null) => void;
  setHistoryId: (id: number | null) => void;
  reset: () => void;
}

export const useQueryStore = create<QueryState>((set) => ({
  selectedConnectionId: null,
  naturalLanguage: "",
  generatedSQL: null,
  queryResult: null,
  isGenerating: false,
  isExecuting: false,
  error: null,
  historyId: null,

  setConnection: (id) => set({ selectedConnectionId: id }),
  setNaturalLanguage: (nl) => set({ naturalLanguage: nl }),
  setGeneratedSQL: (sql) => set({ generatedSQL: sql }),
  setQueryResult: (result) => set({ queryResult: result }),
  setGenerating: (v) => set({ isGenerating: v }),
  setExecuting: (v) => set({ isExecuting: v }),
  setError: (e) => set({ error: e }),
  setHistoryId: (id) => set({ historyId: id }),
  reset: () =>
    set({ generatedSQL: null, queryResult: null, error: null, historyId: null }),
}));
