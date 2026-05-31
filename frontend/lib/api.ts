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
  generate: (data: { connection_id: number; natural_language: string }) =>
    api.post("/queries/generate", data),
  execute: (data: { connection_id: number; sql: string; history_id?: number }) =>
    api.post("/queries/execute", data),
  history: (limit = 50, offset = 0) =>
    api.get(`/queries/history?limit=${limit}&offset=${offset}`),
  deleteHistory: (id: number) => api.delete(`/queries/history/${id}`),
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
