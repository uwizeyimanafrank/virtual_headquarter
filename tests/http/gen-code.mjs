// Prints a 6-digit authenticator code for a secret. Usage: node gen-code.mjs <secret> [seconds-offset]
import { generateSync } from "otplib";
const [secret, offset = "0"] = process.argv.slice(2);
console.log(generateSync({ secret, epoch: Math.floor(Date.now() / 1000) + Number(offset) }));
