const { readdirSync } = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const workspaceRoot = path.resolve(__dirname, "..");
const testsDirectory = path.join(workspaceRoot, "test");

const testFiles = readdirSync(testsDirectory)
  .filter((fileName) => fileName.endsWith(".test.ts"))
  .sort((left, right) => left.localeCompare(right));

for (const fileName of testFiles) {
  console.log(`Running ${fileName}...`);
  const result = spawnSync(
    "npx",
    ["ts-node", "--transpile-only", "-P", "tsconfig.json", path.join("test", fileName)],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        TS_NODE_PROJECT: "tsconfig.json"
      }
    }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
