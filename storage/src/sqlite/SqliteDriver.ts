/**
 * Minimal SQL execution port the SqliteAdapter delegates to (SP1 §7.2). Each
 * per-platform driver (desktop better-sqlite3 over IPC; mobile expo-sqlite)
 * implements this — there is NO per-platform adapter subclass.
 *
 * `run` returns `changes` so update-of-missing can be detected (changes === 0).
 * `all`/`get` return rows shaped `{ doc }` because the storage table is
 * `(id TEXT PRIMARY KEY, doc TEXT)` and selects project only `doc`.
 */
export interface SqliteDriver {
  exec(sql: string): Promise<void>;
  run(sql: string, params: unknown[]): Promise<{ changes: number }>;
  all(sql: string, params: unknown[]): Promise<{ doc: string }[]>;
  get(sql: string, params: unknown[]): Promise<{ doc: string } | undefined>;
  /** Optional real transaction (mobile/expo provides it; desktop defers — SP1 §11). */
  tx?<T>(fn: () => Promise<T>): Promise<T>;
}
