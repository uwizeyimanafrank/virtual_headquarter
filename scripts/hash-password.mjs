// Makes the value for ADMIN_BOOTSTRAP_HASH. Run:  node scripts/hash-password.mjs
// Your password is typed hidden and never saved anywhere.
import { hash } from "@node-rs/argon2";
import readline from "node:readline";

// Reads one line. In a real terminal the typing is hidden. If input is piped (tests), it just reads lines.
let pipedLines;
async function ask(question) {
  process.stdout.write(question);
  if (!process.stdin.isTTY) {
    pipedLines ??= readline.createInterface({ input: process.stdin })[Symbol.asyncIterator]();
    const { value } = await pipedLines.next();
    process.stdout.write("\n");
    return value ?? "";
  }
  return new Promise((resolve) => {
    let text = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\u0003") process.exit(130); // Ctrl+C
        if (c === "\r" || c === "\n") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.off("data", onData);
          process.stdout.write("\n");
          return resolve(text);
        }
        if (c === "\u007f" || c === "\b") text = text.slice(0, -1);
        else text += c;
      }
    };
    process.stdin.on("data", onData);
  });
}

const p1 = await ask("Choose a long, unique password: ");
const p2 = await ask("Type it again: ");
if (p1 !== p2) { console.error("Passwords do not match."); process.exit(1); }
if (p1.length < 12) { console.error("Use at least 12 characters."); process.exit(1); }
const h = await hash(p1, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
// Base64 on purpose: .env loaders damage the "$" signs inside a raw argon2 hash.
console.log("\nPut this line in your .env (and in your host's Environment settings):\n");
console.log(`ADMIN_BOOTSTRAP_HASH=b64:${Buffer.from(h).toString("base64")}\n`);
process.exit(0);
