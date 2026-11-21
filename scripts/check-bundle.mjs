import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2] ?? "dist";
const patterns = [
  /AIza[0-9A-Za-z_-]{35}/,
  /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/,
  /(?:process\.env|import\.meta\.env)(?:\.GEMINI_API_KEY|\[["\x27]GEMINI_API_KEY["\x27]\])/,
];
const filenames = await readdir(root, { recursive: true });
let count = 0;
let failed = false;
for (const name of filenames) {
  const path = join(root, name);
  if (!(await stat(path)).isFile() || !/\.(?:m?js|cjs|css|html|map|json)$/i.test(name)) continue;
  const content = await readFile(path, "utf8");
  count += 1;
  if (patterns.some((pattern) => pattern.test(content))) {
    failed = true;
    console.error(`Potential credential or server credential reference in ${name}`);
  }
}
if (count === 0) throw new Error(`No browser bundle files found in ${root}`);
if (failed) process.exitCode = 1;
else console.log(`Checked ${count} browser bundle files for credential patterns.`);
