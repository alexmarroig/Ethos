const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidBackupConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    if (manifest.application && manifest.application[0]) {
      manifest.application[0].$['android:allowBackup'] = 'false';
    }
    return config;
  });
};
