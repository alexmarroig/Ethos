const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidBackupConfig = (config) => {
  // 1. Update AndroidManifest.xml to point to the rules file
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    mainApplication.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';
    mainApplication.$['android:fullBackupContent'] = '@xml/data_extraction_rules';
    return config;
  });

  // 2. Create the xml file in the native project
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      if (!fs.existsSync(resXmlDir)) {
        fs.mkdirSync(resXmlDir, { recursive: true });
      }
      const rulesFile = path.join(resXmlDir, 'data_extraction_rules.xml');
      const rulesContent = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <exclude domain="database" path="ethos.db"/>
        <exclude domain="file" path="vault"/>
        <exclude domain="file" path="ethos-transcription-temp"/>
    </cloud-backup>
    <device-transfer>
        <exclude domain="database" path="ethos.db"/>
        <exclude domain="file" path="vault"/>
        <exclude domain="file" path="ethos-transcription-temp"/>
    </device-transfer>
</data-extraction-rules>`;
      fs.writeFileSync(rulesFile, rulesContent);
      return config;
    },
  ]);

  return config;
};

module.exports = withAndroidBackupConfig;
