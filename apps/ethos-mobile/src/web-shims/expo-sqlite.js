// Web shim for expo-sqlite — uses in-memory mock on browser
const mockDb = {
  execAsync: async () => {},
  getFirstAsync: async (sql) => {
    if (sql.includes('integrity_check')) return { integrity_check: 'ok' };
    if (sql.includes('user_version')) return { user_version: 2 };
    return null;
  },
  getAllAsync: async () => [],
  runAsync: async () => ({ lastInsertRowId: 1, changes: 1 }),
};

export const openDatabaseAsync = async () => mockDb;
export const openDatabaseSync = () => mockDb;
export const SQLiteProvider = ({ children }) => children;
export const useSQLiteContext = () => mockDb;
export default { openDatabaseAsync, openDatabaseSync, SQLiteProvider, useSQLiteContext };
