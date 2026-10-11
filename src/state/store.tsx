import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { loadDatabase, updateDatabase, type Database, type SaveResult } from '../lib/storage';

interface StoreValue {
  db: Database;
  update: (mutator: (db: Database) => Database) => SaveResult;
  refresh: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase());

  const refresh = useCallback(() => setDb(loadDatabase()), []);

  const update = useCallback((mutator: (database: Database) => Database) => {
    const result = updateDatabase(mutator);
    setDb(loadDatabase());
    return result;
  }, []);

  const value = useMemo(() => ({ db, update, refresh }), [db, update, refresh]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
