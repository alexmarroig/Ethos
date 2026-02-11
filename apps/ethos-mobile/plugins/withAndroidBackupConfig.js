const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RULES_CONTENT = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="database" path="ethos.db"/>
        <exclude domain="database" path="ethos.db-wal"/>
        <exclude domain="database" path="ethos.db-shm"/>
        <exclude domain="file" path="vault"/>
        <exclude domain="cache" path="."/>
        <exclude domain="file" path="ethos-transcription-temp"/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="database" path="ethos.db"/>
        <exclude domain="database" path="ethos.db-wal"/>
        <exclude domain="database" path="ethos.db-shm"/>
        <exclude domain="file" path="vault"/>
        <exclude domain="cache" path="."/>
        <exclude domain="file" path="ethos-transcription-temp"/>
    </device-transfer>
</data-extraction-rules>`;

const withAndroidBackupConfig = (config) => {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    mainApplication.$['android:fullBackupContent'] = '@xml/data_extraction_rules';
    mainApplication.$['android:allowBackup'] = 'true';
    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml');
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }

      const rulesFile = path.join(resXmlDir, 'data_extraction_rules.xml');
      fs.writeFileSync(rulesFile, RULES_CONTENT);
      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidBackupConfig;
