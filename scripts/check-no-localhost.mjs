// Fails the build if source code contains localhost, 127.0.0.1 or a hardcoded web address.
// Rule of the project: the same code must run on any server; only .env changes.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const DIRS = ["app", "components", "lib", "models", "hooks"];
const FILES = ["proxy.ts", "middleware.ts", "next.config.ts"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
// Addresses that are namespaces/standards, not servers we call.
// Third-party service endpoints we deliberately allow (CSP for Cloudinary images/uploads).
const ALLOWED_HOSTS = ["www.w3.org", "res.cloudinary.com", "api.cloudinary.com", "api.render.com"];

const problems = [];

function scanFile(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return; // comments are harmless
    if (line.includes("check:urls-ignore")) return; // a line may opt out on purpose (for example the list of blocked private addresses)
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(line)) {
      problems.push(`${path}:${i + 1}  contains localhost / local address`);
    }
    for (const m of line.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
      if (!ALLOWED_HOSTS.includes(m[1])) {
        problems.push(`${path}:${i + 1}  hardcoded address ${m[0]}`);
      }
    }
  });
}

function walk(dir) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".") || name === "tests") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (EXTS.has(extname(p)) && !/\.test\.[a-z]+$/.test(name)) scanFile(p); // test files hold example data, not real addresses
  }
}

DIRS.forEach((d) => walk(join(ROOT, d)));
FILES.forEach((f) => { try { scanFile(join(ROOT, f)); } catch {} });

if (problems.length) {
  console.error("\ncheck:urls FAILED. Use api() / lib/env.ts / APP_URL instead of hardcoded addresses:\n");
  problems.forEach((p) => console.error("  " + p));
  console.error("");
  process.exit(1);
}
console.log("check:urls OK (no hardcoded addresses found)");
