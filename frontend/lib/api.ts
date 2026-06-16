import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// Connections
export const connectionsApi = {
  list: () => api.get("/connections"),
  create: (data: { name: string; host: string; port: number; database: string; username: string; password: string }) =>
    api.post("/connections", data),
  delete: (id: number) => api.delete(`/connections/${id}`),
  schema: (id: number) => api.get(`/connections/${id}/schema`),
  test: (id: number) => api.post(`/connections/${id}/test`),
};

// Queries
export const queriesApi = {
  generate: (data: { connection_id: number; natural_language: string; previous_question?: string; previous_sql?: string }) =>
    api.post("/queries/generate", data),
  execute: (data: { connection_id: number; sql: string; history_id?: number }) =>
    api.post("/queries/execute", data),
  history: (limit = 50, offset = 0) =>
    api.get(`/queries/history?limit=${limit}&offset=${offset}`),
  deleteHistory: (id: number) => api.delete(`/queries/history/${id}`),
  // Saved queries
  saveQuery: (data: { name: string; description?: string; sql: string }) =>
    api.post("/queries/saved", data),
  listSaved: () => api.get("/queries/saved"),
  deleteSaved: (id: number) => api.delete(`/queries/saved/${id}`),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get("/dashboard/stats"),
};

// CSV
export const csvApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/csv/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  tables: () => api.get("/csv/tables"),
  deleteTable: (id: number) => api.delete(`/csv/tables/${id}`),
};

// Streaming SQL generation via fetch + ReadableStream
export async function* streamGenerateSql(data: {
  connection_id: number;
  natural_language: string;
  previous_question?: string;
  previous_sql?: string;
}): AsyncGenerator<{ type: string; content?: string; message?: string; data?: Record<string, unknown> }> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE}/queries/generate/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok || !res.body) {
    throw new Error("Stream request failed");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          yield JSON.parse(line.slice(6));
        } catch {
          // skip malformed
        }
      }
    }
  }
}
