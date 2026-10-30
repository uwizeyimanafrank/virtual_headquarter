import "server-only";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import { getAdminSlug } from "@/lib/auth";
import { pingDb } from "@/lib/db";
import { getEnv, hasEnv } from "@/lib/env";
import { pingCloudinary } from "@/lib/cloudinary";

export type Check = { id: string; label: string; status: "ok" | "warn" | "fail"; detail: string; why: string; fix: string };

/** Runs every setup check. Returns plain-words results and NEVER any secret value. */
export async function runChecks(): Promise<Check[]> {
  const env = getEnv();
  const prod = process.env.NODE_ENV === "production";
  const checks: Check[] = [];

  const dbOk = hasEnv("MONGODB_URI") ? await pingDb() : false;
  checks.push({
    id: "database", label: "Database (MongoDB)",
    status: dbOk ? "ok" : "fail",
    detail: !hasEnv("MONGODB_URI") ? "MONGODB_URI is not set." : dbOk ? "Connected." : "Could not connect.",
    why: "Everything you publish and every login lives here.",
    fix: "Put your Atlas connection string in MONGODB_URI. In Atlas, allow this server's address under Network Access, and check the database user and password.",
  });

  const cloudSet = hasEnv("CLOUDINARY_CLOUD_NAME") && hasEnv("CLOUDINARY_API_KEY") && hasEnv("CLOUDINARY_API_SECRET");
  const cloudOk = cloudSet ? await pingCloudinary() : false;
  checks.push({
    id: "cloudinary", label: "Image hosting (Cloudinary)",
    status: cloudOk ? "ok" : cloudSet ? "fail" : "warn",
    detail: !cloudSet ? "One or more CLOUDINARY_ values are missing." : cloudOk ? "Connected." : "Values are set but Cloudinary refused or could not be reached.",
    why: "Needed to upload and show your own images. Sample images work without it.",
    fix: "Copy cloud name, API key and API secret from your Cloudinary dashboard into the three CLOUDINARY_ variables.",
  });

  checks.push({
    id: "gemini", label: "AI Twin (Gemini)",
    status: hasEnv("GEMINI_API_KEY") ? "ok" : "warn",
    detail: hasEnv("GEMINI_API_KEY") ? "Key is set (not tested yet)." : "GEMINI_API_KEY is not set.",
    why: "Powers the AI Twin from phase P07. Not needed before that.",
    fix: "Create a free key in Google AI Studio and put it in GEMINI_API_KEY.",
  });

  let keyStatus: Check["status"] = "fail";
  let keyDetail = "SERVICE_CRED_KEY is not set.";
  if (env.SERVICE_CRED_KEY) {
    const len = Buffer.from(env.SERVICE_CRED_KEY, "base64").length;
    keyStatus = len === 32 ? "ok" : "fail";
    keyDetail = len === 32 ? "Set and the right length." : "Set, but it is not 32 random bytes in base64.";
  }
  checks.push({
    id: "serviceKey", label: "Encryption key",
    status: keyStatus, detail: keyDetail,
    why: "Encrypts your 2FA secret. If this key changes or is lost, 2FA must be reset.",
    fix: "Make one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" and BACK IT UP.",
  });

  checks.push({
    id: "sessionSecret", label: "Session secret",
    status: hasEnv("SESSION_SECRET") ? "ok" : prod ? "fail" : "warn",
    detail: hasEnv("SESSION_SECRET") ? "Set." : "SESSION_SECRET is not set.",
    why: "Salts stored IP hashes. Required when running in production.",
    fix: "Make 32 random bytes in base64 (same command as the encryption key, different value).",
  });

  const url = env.APP_URL ?? "";
  checks.push({
    id: "appUrl", label: "App address (APP_URL)",
    status: !url ? "warn" : prod && !url.startsWith("https://") ? "warn" : "ok",
    detail: !url ? "APP_URL is not set." : url.startsWith("https://") ? "Set, using https (cookies are Secure)." : "Set, using http. Fine on your own PC, not for a public site.",
    why: "Decides if login cookies are Secure and which sites may call your API.",
    fix: "Set APP_URL to this server's public address. Public sites must use https.",
  });

  checks.push({
    id: "adminSlug", label: "Office address",
    status: getAdminSlug() ? "ok" : "fail",
    detail: getAdminSlug() ? "Valid." : "ADMIN_ROUTE_SLUG is missing or not allowed.",
    why: "The secret address of this Office.",
    fix: "Use 8 to 64 characters: lowercase letters, digits and hyphens.",
  });
  return checks;
}

export type TestResult = { ok: boolean; reason: "ok" | "format" | "dns" | "auth" | "network" | "unknown"; message: string };

const MESSAGES: Record<TestResult["reason"], string> = {
  ok: "Connection works.",
  format: "The value does not look right. Check you copied the whole connection string, including the start (mongodb:// or mongodb+srv://).",
  dns: "The server name could not be found. Check the address for typos and that you are online.",
  auth: "The server answered but refused the username or password. Check the database user and password (special characters in the password must be URL-encoded).",
  network: "Could not reach the server in time. In Atlas, check Network Access allows this server's address, and that the cluster is running.",
  unknown: "The test failed for a reason we could not identify.",
};

const result = (reason: TestResult["reason"]): TestResult => ({ ok: reason === "ok", reason, message: MESSAGES[reason] });

/**
 * Tests a pasted MongoDB connection string with a TEMPORARY connection.
 * The value is never stored, never logged and never returned. Only a coarse reason is returned,
 * because raw driver errors can contain parts of the address.
 */
export async function testMongo(uri: string): Promise<TestResult> {
  if (!/^mongodb(\+srv)?:\/\/\S+$/.test(uri)) return result("format");
  const conn = mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, maxPoolSize: 1, bufferCommands: false });
  try {
    await conn.asPromise();
    await conn.db?.admin().ping();
    return result("ok");
  } catch (err) {
    const m = `${(err as Error)?.name ?? ""} ${(err as Error)?.message ?? ""}`.toLowerCase();
    if (m.includes("authentication failed") || m.includes("bad auth") || m.includes("auth failed")) return result("auth");
    if (m.includes("enotfound") || m.includes("querysrv") || m.includes("getaddrinfo") || m.includes("eai_again")) return result("dns");
    if (m.includes("parse") || m.includes("invalid scheme") || m.includes("invalid connection string") || m.includes("mongoparse")) return result("format");
    if (m.includes("server selection") || m.includes("timed out") || m.includes("econnrefused") || m.includes("etimedout") || m.includes("econnreset")) return result("network");
    return result("unknown");
  } finally {
    await conn.close().catch(() => {});
  }
}

/** Tests pasted Cloudinary values without saving them. */
export async function testCloudinary(v: { cloudName: string; apiKey: string; apiSecret: string }): Promise<TestResult> {
  try {
    await cloudinary.api.ping({ cloud_name: v.cloudName, api_key: v.apiKey, api_secret: v.apiSecret });
    return result("ok");
  } catch (err) {
    const e = err as { error?: { http_code?: number; message?: string }; code?: string; message?: string };
    const code = e?.error?.http_code;
    const m = `${e?.code ?? ""} ${e?.message ?? ""} ${e?.error?.message ?? ""}`.toLowerCase();
    if (code === 401 || code === 403 || m.includes("invalid") || m.includes("unauthorized")) return { ok: false, reason: "auth", message: "Cloudinary refused these values. Check the cloud name, API key and API secret." };
    if (m.includes("enotfound") || m.includes("econnrefused") || m.includes("etimedout") || m.includes("getaddrinfo")) return result("network");
    return result("unknown");
  }
}
