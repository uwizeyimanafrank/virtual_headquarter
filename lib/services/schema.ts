import { z } from "zod";
import { text } from "@/lib/validation";
import { SERVICE_TYPES, type ServiceType } from "@/models/Service";

/** Credentials each kind of service accepts. Anything else is refused. Never logged, never sent back. */
const credentialShapes = {
  http: z.object({ token: z.string().min(1).max(500) }).strict(),
  mongodb: z.object({ uri: z.string().max(2000).regex(/^mongodb(\+srv)?:\/\/\S+$/, "must be a MongoDB connection string") }).strict(),
  cloudinary: z.object({ cloudName: z.string().regex(/^[a-z0-9_-]{2,60}$/i), apiKey: z.string().regex(/^\d{6,20}$/), apiSecret: z.string().min(8).max(100) }).strict(),
  render: z.object({ apiKey: z.string().min(8).max(200), serviceId: z.string().regex(/^srv-[a-z0-9]{6,40}$/, "looks like srv-xxxxxxxx") }).strict(),
} satisfies Record<ServiceType, z.ZodType>;

export function parseCredentials(type: ServiceType, raw: unknown) {
  return credentialShapes[type].safeParse(raw);
}

/** An http(s) address with no login details inside it. */
const webAddress = z.string().max(300).refine((v) => {
  try { const u = new URL(v); return (u.protocol === "http:" || u.protocol === "https:") && !u.username && !u.password; } catch { return false; }
}, "must be a web address starting with http:// or https:// (without a user name or password in it)");

const healthPath = z.string().max(200).regex(/^\/\S*$/, "must start with / and contain no spaces");
const limitMb = z.number().positive().max(10_000_000).nullable();
const credentials = z.record(z.string(), z.string());

export const serviceCreate = z.object({
  name: text(80).pipe(z.string().min(1)),
  type: z.enum(SERVICE_TYPES),
  baseUrl: webAddress.optional(),
  healthPath: healthPath.default("/"),
  enabled: z.boolean().default(true),
  limitMb: limitMb.optional(),
  credentials: credentials.optional(),
}).superRefine((v, ctx) => {
  if (v.type === "http" && !v.baseUrl) ctx.addIssue({ code: "custom", path: ["baseUrl"], message: "an address is needed for this kind of service" });
});

export const serviceUpdate = z.object({
  name: text(80).pipe(z.string().min(1)).optional(),
  baseUrl: webAddress.optional(),
  healthPath: healthPath.optional(),
  enabled: z.boolean().optional(),
  limitMb: limitMb.optional(),
  credentials: credentials.optional(),
  clearCredentials: z.boolean().optional(),
});

export const MAX_SERVICES = 30;
