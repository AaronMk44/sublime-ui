import type { DatabaseAdapter } from '@sublime-ui/framework';
import { SqliteAdapter } from './sqlite/SqliteAdapter.js';
import type { SqliteDriver } from './sqlite/SqliteDriver.js';

/**
 * Minimal subset of the expo-sqlite async API we depend on (SP1 §7.2). Declared
 * locally so `@sublime-ui/storage` does not need expo's types in CI; the real
 * module satisfies this shape (`openDatabaseAsync`/`runAsync`/`getAllAsync`/
 * `getFirstAsync`/`withTransactionAsync`).
 */
interface ExpoDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: unknown[]): Promise<{ changes: number }>;
  getAllAsync(sql: string, params: unknown[]): Promise<{ doc: string }[]>;
  getFirstAsync(sql: string, params: unknown[]): Promise<{ doc: string } | null>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}
interface ExpoSqliteModule {
  openDatabaseAsync(name: string): Promise<ExpoDatabase>;
}

/** Adapt an opened expo database to the SqliteDriver port. */
function expoDriver(db: ExpoDatabase): SqliteDriver {
  return {
    exec: (sql) => db.execAsync(sql),
    run: (sql, params) => db.runAsync(sql, params),
    all: (sql, params) => db.getAllAsync(sql, params),
    get: async (sql, params) => (await db.getFirstAsync(sql, params)) ?? undefined,
    tx: async <T>(fn: () => Promise<T>): Promise<T> => {
      let result!: T;
      await db.withTransactionAsync(async () => {
        result = await fn();
      });
      return result;
    },
  };
}

/**
 * Open an expo-sqlite database and wrap it in a SqliteAdapter. `expo-sqlite` is
 * an optional peer dependency imported dynamically so it never resolves outside
 * a React Native bundle.
 */
export async function createExpoSqliteAdapter(databaseName = 'sublime.db'): Promise<DatabaseAdapter> {
  const mod = (await import('expo-sqlite')) as unknown as ExpoSqliteModule;
  const db = await mod.openDatabaseAsync(databaseName);
  return new SqliteAdapter(expoDriver(db));
}
