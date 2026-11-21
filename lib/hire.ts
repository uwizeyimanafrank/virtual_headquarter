// Content of the /hire page (P14). Everything visitors read comes from the Office; these defaults are only what shows
// until the owner edits it, so the page looks finished from day one. Pure code: no database, testable with a fake clock.
import { z } from "zod";
// Same cleaning as lib/validation.ts `text`, kept here so this file never pulls server-only code in.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
const t = (max: number) => z.string().transform(clean).pipe(z.string().max(max));

export const AVAILABILITY = ["open", "busy", "from"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY)[number];

export type HireContent = {
  headline: string;
  intro: string;
  availability: { status: AvailabilityStatus; from: string; note: string }; // from = YYYY-MM-DD, used when status is "from"
  services: { title: string; text: string }[]; // 1 to 6 cards
  steps: { title: string; text: string }[]; // exactly 3
  faq: { q: string; a: string }[]; // 0 to 10
};

export const HIRE_LIMITS = { headline: 100, intro: 400, note: 160, serviceTitle: 60, serviceText: 240, stepTitle: 50, stepText: 240, q: 140, a: 600, services: 6, faq: 10 } as const;

export const HIRE_DEFAULTS: HireContent = {
  headline: "Let us build something that works.",
  intro: "I design and build web products from the screen to the database. If you have a real problem and a real deadline, tell me about it below.",
  availability: { status: "open", from: "", note: "" },
  services: [
    { title: "Websites and web apps", text: "Fast, responsive sites and apps built with React, Next.js and a Node or PHP backend, with a database behind them when you need one." },
    { title: "Admin dashboards and content systems", text: "A private place where you or your team can add and change content without touching code." },
    { title: "Fixes, speed and security", text: "Find what is slow, broken or exposed in an existing project, and fix it step by step." },
  ],
  steps: [
    { title: "You tell me the goal", text: "A short message about what you need, who it is for and when. No long forms." },
    { title: "We agree on a small first step", text: "A clear scope, a price or time estimate, and something you can see early." },
    { title: "I build, you review", text: "Regular small deliveries so you can change direction before it gets expensive." },
  ],
  faq: [
    { q: "Do you work with people outside Rwanda?", a: "Yes. Everything can be done remotely, with clear written updates and calls when they help." },
    { q: "How do we start?", a: "Send the form on this page. I read every request and answer personally." },
    { q: "Can you take over an existing project?", a: "Often, yes. Send me a link to the code or the live site and I will tell you honestly what I see." },
  ],
};

const tReq = (max: number) => t(max).pipe(z.string().min(1));
const pair = (a: number, b: number) => z.object({ title: tReq(a), text: tReq(b) });

/** What the Office may save. Strict: wrong shape or too long is refused with a reason. */
export const hireInput = z.object({
  headline: tReq(HIRE_LIMITS.headline),
  intro: t(HIRE_LIMITS.intro),
  availability: z.object({
    status: z.enum(AVAILABILITY),
    from: z.union([z.iso.date(), z.literal("")]),
    note: t(HIRE_LIMITS.note),
  }).refine((a) => a.status !== "from" || a.from !== "", { message: "pick the date you become available", path: ["from"] }),
  services: z.array(pair(HIRE_LIMITS.serviceTitle, HIRE_LIMITS.serviceText)).min(1).max(HIRE_LIMITS.services),
  steps: z.array(pair(HIRE_LIMITS.stepTitle, HIRE_LIMITS.stepText)).length(3),
  faq: z.array(z.object({ q: tReq(HIRE_LIMITS.q), a: tReq(HIRE_LIMITS.a) })).max(HIRE_LIMITS.faq),
});

/**
 * The content to show, from whatever is stored. Each part is checked on its own: a part that is missing or damaged
 * falls back to the default for THAT part only, so one bad field never blanks the page.
 */
export function resolveHire(stored: unknown): HireContent {
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const part = <K extends keyof HireContent>(key: K, schema: z.ZodType<HireContent[K]>): HireContent[K] => {
    const r = schema.safeParse(s[key]);
    return r.success ? r.data : HIRE_DEFAULTS[key];
  };
  const shape = hireInput.shape;
  return {
    headline: part("headline", shape.headline),
    intro: part("intro", shape.intro),
    availability: part("availability", shape.availability as unknown as z.ZodType<HireContent["availability"]>),
    services: part("services", shape.services),
    steps: part("steps", shape.steps),
    faq: part("faq", shape.faq),
  };
}

export type Badge = { tone: "open" | "busy" | "soon"; label: string };

const longDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The availability badge. A "from" date flips to "open" by itself once the day has come. */
export function availabilityBadge(a: HireContent["availability"], now: Date): Badge {
  if (a.status === "busy") return { tone: "busy", label: "Fully booked right now" };
  if (a.status === "from" && a.from && a.from > now.toISOString().slice(0, 10)) return { tone: "soon", label: `Available from ${longDate(a.from)}` };
  return { tone: "open", label: "Open to new work" };
}

