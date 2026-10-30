import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { connectDb } from "@/lib/db";
import { cookiesSecure } from "@/lib/auth";
import { ipHash } from "@/lib/request";
import { deviceLabel } from "@/lib/device";
import { Session } from "@/models/Session";

export const COOKIE_NAME = "vhq_session";
export type Stage = "pending" | "enroll" | "full";

const MIN = 60_000;
export const IDLE_MS = 10 * MIN; // logged out after 10 minutes without activity
export const ABSOLUTE_MS = 12 * 60 * MIN; // and never later than 12 hours after login
const PARTIAL_MS = 10 * MIN; // time allowed to finish 2FA after the password step
const ROTATE_MS = 15 * MIN; // cookie token is replaced every 15 minutes while active
const GRACE_MS = MIN; // the previous token still works for one minute (parallel requests)
const TOUCH_MS = 30_000; // don't write lastSeen more often than this

const newToken = () => randomBytes(32).toString("base64url");
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(adminId: string, stage: Stage, h: Headers) {
  await connectDb();
  const token = newToken();
  const now = new Date();
  await Session.create({
    adminId,
    tokenHash: hashToken(token),
    stage,
    deviceLabel: deviceLabel(h),
    ipHash: ipHash(h),
    createdAt: now,
    lastSeen: now,
    rotatedAt: now,
    expiresAt: new Date(now.getTime() + (stage === "full" ? ABSOLUTE_MS : PARTIAL_MS)),
    twoFactorAt: stage === "full" ? now : null,
  });
  return token;
}

/** Finds a valid, live session for a cookie token (or null). Enforces idle and absolute limits. */
export async function findSession(token: string | undefined) {
  if (!token) return null;
  await connectDb();
  const now = new Date();
  const th = hashToken(token);
  const s = await Session.findOne({
    $or: [{ tokenHash: th }, { prevTokenHash: th, prevValidUntil: { $gt: now } }],
    revoked: false,
    expiresAt: { $gt: now },
  }).lean();
  if (!s) return null;
  if (s.stage === "full" && now.getTime() - s.lastSeen.getTime() > IDLE_MS) return null;
  if (now.getTime() - s.lastSeen.getTime() > TOUCH_MS) {
    await Session.updateOne({ _id: s._id }, { $set: { lastSeen: now } });
  }
  return s;
}

/** Gives a session a brand-new token and a new stage/limits. Used after 2FA (prevents session fixation). */
export async function promoteSession(id: unknown, h: Headers) {
  await connectDb();
  const token = newToken();
  const now = new Date();
  await Session.updateOne(
    { _id: id },
    {
      $set: {
        tokenHash: hashToken(token), prevTokenHash: "", prevValidUntil: null, stage: "full",
        twoFactorAt: now, lastSeen: now, rotatedAt: now, createdAt: now,
        expiresAt: new Date(now.getTime() + ABSOLUTE_MS), deviceLabel: deviceLabel(h), ipHash: ipHash(h),
      },
    },
  );
  return token;
}

/** Replaces the cookie token if it is older than 15 minutes. Returns the new token, or null if not due. */
export async function rotateIfDue(s: { _id: unknown; rotatedAt: Date; tokenHash: string }) {
  const now = new Date();
  if (now.getTime() - s.rotatedAt.getTime() < ROTATE_MS) return null;
  const token = newToken();
  await Session.updateOne(
    { _id: s._id },
    { $set: { prevTokenHash: s.tokenHash, prevValidUntil: new Date(now.getTime() + GRACE_MS), tokenHash: hashToken(token), rotatedAt: now } },
  );
  return token;
}

export async function markTwoFactor(id: unknown) {
  await connectDb();
  await Session.updateOne({ _id: id }, { $set: { twoFactorAt: new Date() } });
}

export async function revokeSession(id: unknown) {
  await connectDb();
  await Session.updateOne({ _id: id }, { $set: { revoked: true } });
}

/** Ends every session of this admin, optionally keeping one. Returns how many were ended. */
export async function revokeAll(adminId: unknown, exceptId?: unknown) {
  await connectDb();
  const filter: Record<string, unknown> = { adminId, revoked: false };
  if (exceptId) filter._id = { $ne: exceptId };
  const r = await Session.updateMany(filter, { $set: { revoked: true } });
  return r.modifiedCount;
}

export async function currentToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: cookiesSecure(),
    sameSite: "strict",
    path: "/",
    maxAge: ABSOLUTE_MS / 1000,
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(COOKIE_NAME, "", { httpOnly: true, secure: cookiesSecure(), sameSite: "strict", path: "/", maxAge: 0 });
}
