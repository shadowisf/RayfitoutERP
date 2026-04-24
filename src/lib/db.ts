// lib/db.ts
//
// VERCEL SERVERLESS CONNECTION STRATEGY
// ──────────────────────────────────────
// Vercel runs each API route in its own isolated serverless process.
// Processes cannot share memory, so there is no way to share a single pool
// across /api/mr, /api/notification, /api/projects … running simultaneously.
//
// What we CAN do at the application level:
//
//  1. globalForDb singleton  – reuses the pool across warm re-invocations of
//     the *same* route (Next.js module cache persists between requests on a
//     warm container). Avoids redundant pool creation within one hot function.
//
//  2. Low connectionLimit (3)  – even if 200 pools are alive in parallel,
//     total connections ≤ 600, within most MySQL plans.
//     (Old value 10 × 200 instances = 2 000 connections → crash)
//
//  3. maxIdle: 0  – connections returned to the OS immediately after a
//     query finishes rather than being held idle. Critical for serverless
//     where a Lambda can sit warm for minutes between requests.
//
//  4. enableKeepAlive: false  – stops idle Lambdas pinging MySQL to keep
//     connections open, letting the MySQL server reclaim slots naturally.
//
//  5. query() / execute() retry wrapper  – if MySQL briefly returns
//     ER_CON_COUNT_ERROR (Too many connections), wait a moment and retry
//     up to MAX_RETRIES times before giving up. This makes the app resilient
//     to short-lived spikes without crashing.

import mysql from "mysql2/promise";

// ── Pool ──────────────────────────────────────────────────────────────────────

const globalForDb = global as unknown as { pool: mysql.Pool | undefined };

const pool =
  globalForDb.pool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true, // queue requests rather than throw immediately
    connectionLimit: 3, // ≤ 3 connections per function instance
    maxIdle: 0, // release connections immediately when idle
    idleTimeout: 10_000, // close any lingering idle conn after 10 s
    connectTimeout: 15_000, // give up connecting after 15 s
    queueLimit: 100, // allow up to 100 queued queries per instance

    enableKeepAlive: false, // let MySQL reclaim slots from idle lambdas
  });

// Development only: reuse the pool across Next.js hot-module-reloads
if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 200; // base delay; doubles on each attempt

const RETRYABLE_CODES = new Set([
  "ER_CON_COUNT_ERROR", // Too many connections
  "ETIMEDOUT", // Connection timed out
  "ECONNRESET", // Connection reset
  "PROTOCOL_CONNECTION_LOST",
]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const code: string = err?.code ?? "";
      if (!RETRYABLE_CODES.has(code)) throw err; // non-retryable – fail fast
      if (attempt < MAX_RETRIES - 1) {
        await wait(RETRY_DELAY_MS * 2 ** attempt); // 200 ms, 400 ms, …
      }
    }
  }
  throw lastError;
}

// ── Public db export (drop-in replacement for the old pool export) ───────────
// Patch query/execute on the pool instance so that every call goes through
// the retry wrapper. Because we mutate the pool object itself, `db` remains
// a full mysql.Pool — all other methods (beginTransaction, getConnection, …)
// keep working, and every generic overload is preserved for TypeScript.

const _query = pool.query.bind(pool);
const _execute = pool.execute.bind(pool);

(pool as any).query = function (...args: [any, any?]) {
  return withRetry(() => (_query as any)(...args));
};

(pool as any).execute = function (...args: [any, any?]) {
  return withRetry(() => (_execute as any)(...args));
};

export const db = pool;
