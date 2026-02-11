const { withAppDelegate } = require('@expo/config-plugins');

const IMPORT_STATEMENT = '#import <Foundation/Foundation.h>';
const MARKER = '@implementation AppDelegate';

const HELPER_METHOD = `
- (void)excludeClinicalPathFromBackup:(NSString *)relativePath {
  NSString *documentsPath = [NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES) firstObject];
  if (!documentsPath) {
    return;
  }

  NSString *fullPath = [documentsPath stringByAppendingPathComponent:relativePath];
  NSURL *url = [NSURL fileURLWithPath:fullPath];

  if (![[NSFileManager defaultManager] fileExistsAtPath:fullPath]) {
    return;
  }

  NSError *resourceError = nil;
  BOOL success = [url setResourceValue:@(YES) forKey:NSURLIsExcludedFromBackupKey error:&resourceError];
  if (!success || resourceError) {
    return;
  }
}

- (void)configureClinicalBackupExclusions {
  [self excludeClinicalPathFromBackup:@"vault"];
  [self excludeClinicalPathFromBackup:@"SQLite/ethos.db"];
  [self excludeClinicalPathFromBackup:@"SQLite/ethos.db-wal"];
  [self excludeClinicalPathFromBackup:@"SQLite/ethos.db-shm"];
}
`;

const LAUNCH_SNIPPET = '  [self configureClinicalBackupExclusions];';

const withIOSBackupExclusion = (config) => {
  return withAppDelegate(config, (config) => {
    let { contents } = config.modResults;

    if (!contents.includes(IMPORT_STATEMENT)) {
      contents = `${IMPORT_STATEMENT}\n${contents}`;
    }

    if (!contents.includes('- (void)configureClinicalBackupExclusions')) {
      contents = contents.replace(MARKER, `${MARKER}\n${HELPER_METHOD}`);
    }

    if (!contents.includes(LAUNCH_SNIPPET)) {
      contents = contents.replace(
        /didFinishLaunchingWithOptions:[^\{]*\{\n/,
        (match) => `${match}${LAUNCH_SNIPPET}\n`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withIOSBackupExclusion;
