export interface ParsedDbUrl {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  error?: string;
}

/**
 * Parses a PostgreSQL connection URL into its individual components.
 * Accepts formats:
 *   postgresql://user:pass@host:port/db
 *   postgres://user:pass@host/db          (default port 5432)
 *   postgresql+asyncpg://user:pass@host/db  (SQLAlchemy dialect prefix stripped)
 */
export function parseDbUrl(url: string): ParsedDbUrl | null {
  if (!url.trim()) return null;

  try {
    // Strip SQLAlchemy dialect suffixes: postgresql+asyncpg:// → postgresql://
    const normalized = url.trim().replace(/^(postgresql|postgres)\+\w+:\/\//, "postgresql://");

    const parsed = new URL(normalized);

    if (!parsed.hostname) return { host: "", port: 5432, database: "", username: "", password: "", error: "Missing host" };

    const database = parsed.pathname.replace(/^\//, "").split("?")[0];
    const port = parsed.port ? parseInt(parsed.port, 10) : 5432;

    return {
      host:     parsed.hostname,
      port:     isNaN(port) ? 5432 : port,
      database: database || "",
      username: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
    };
  } catch {
    return { host: "", port: 5432, database: "", username: "", password: "", error: "Invalid URL format" };
  }
}
