// Web mock for expo-sqlite
// expo-sqlite is native-only. On web, we return a no-op so the app loads.
// Actual offline storage on web uses the API (online) or is disabled.

const noop = async () => {};
const noopSync = () => {};

const makeMockDb = () => ({
  execAsync: noop,
  runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
  getFirstAsync: async () => null,
  getAllAsync: async () => [],
  getEachAsync: async function* () {},
  prepareAsync: async () => ({
    executeAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    finalizeAsync: noop,
  }),
  closeAsync: noop,
  // Sync variants
  execSync: noopSync,
  runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
  getFirstSync: () => null,
  getAllSync: () => [],
  closeSync: noopSync,
});

export const openDatabaseAsync = async (_name) => {
  console.warn('[ethos] expo-sqlite not available on web — using no-op mock');
  return makeMockDb();
};

export const openDatabaseSync = (_name) => {
  console.warn('[ethos] expo-sqlite not available on web — using no-op mock');
  return makeMockDb();
};

export default { openDatabaseAsync, openDatabaseSync };
