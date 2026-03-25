// iOS backup exclusion — no-op in managed workflow (expo-sqlite handles it)
module.exports = function withIOSBackupExclusion(config) {
  return config;
};
