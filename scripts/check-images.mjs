// Fails the build if a PUBLIC page or component hardcodes a picture.
// Rule of the project: every fixed picture is an image slot (lib/image-slots.ts, docs/book/05-image-slots.md)
// so the owner can change it in the Office. Components ask for a slot; they never name a file.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { pathToFileURL } from "node:url";

// Public side only. The Office, the registry itself and demo/sample data may name files.
export const PUBLIC_DIRS = ["app/(site)", "components/home", "components/museum", "components/connect", "components/site", "components/art", "components/ui"];
export const PUBLIC_FILES = ["app/layout.tsx", "app/not-found.tsx"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

const RULES = [
  [/["'`]\/(art|samples)\//, "names a bundled picture file"],
  [/["'`][^"'`\n]*\.(png|jpe?g|webp|gif|avif|svg|ico)(\?[^"'`\n]*)?["'`]/i, "names a picture file"],
  [/res\.cloudinary\.com/, "hardcodes a Cloudinary address"],
];

/** Problems found in one file's text (pure, so it can be tested). */
export function findProblems(text, file = "file") {
  const out = [];
  text.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return; // comments are harmless
    if (line.includes("check:images-ignore")) return; // a line may opt out on purpose
    for (const [re, why] of RULES) if (re.test(line)) { out.push(`${file}:${i + 1}  ${why}. Use an image slot instead (lib/image-slots.ts).`); break; }
  });
  return out;
}

function walk(dir, files) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (EXTS.has(extname(p)) && !/\.test\.[a-z]+$/.test(name)) files.push(p);
  }
}

export function scanProject(root = process.cwd()) {
  const files = PUBLIC_FILES.map((f) => join(root, f));
  PUBLIC_DIRS.forEach((d) => walk(join(root, d), files));
  const problems = [];
  for (const f of files) { try { problems.push(...findProblems(readFileSync(f, "utf8"), f)); } catch { /* file does not exist yet */ } }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = scanProject();
  if (problems.length) {
    console.error("check:images FAILED. Every fixed picture must be an image slot:\n" + problems.map((p) => "  " + p).join("\n"));
    process.exit(1);
  }
  console.log("check:images OK (no hardcoded pictures on the public side)");
}
