// The Home page is made of blocks. The owner decides, in the Office, which blocks show, in what order,
// and what their text says. Nothing about a block is written into a component. See docs/book/chapters/P11.
// To add a block: add it to BLOCK_DEFS here, build its component, then set ready: true.

export type BlockField = { name: string; label: string; max: number; long?: boolean; default: string };
export type BlockDef = {
  key: string;
  label: string;
  description: string;
  ready: boolean; // false = not built yet: hidden on the public site, shown as "coming" in the Office
  required?: boolean; // cannot be switched off
  defaultEnabled: boolean;
  fields: readonly BlockField[];
};

const f = (name: string, label: string, def: string, max = 120, long = false): BlockField => ({ name, label, max, long, default: def });

export const BLOCK_DEFS: readonly BlockDef[] = [
  { key: "hero", label: "Hero (welcome and Canvas CV)", description: "The first screen: your headline, welcome text and the Canvas CV tab. The headline and text are edited under Setup.", ready: true, required: true, defaultEnabled: true, fields: [] },
  { key: "stats", label: "Stats strip", description: "Up to four numbers that say a lot at a glance.", ready: false, defaultEnabled: true, fields: [
    f("title", "Heading", "At a glance", 60),
    f("stat1Value", "Number 1", "2", 12), f("stat1Label", "Label 1", "Internships", 40),
    f("stat2Value", "Number 2", "3+", 12), f("stat2Label", "Label 2", "Projects built", 40),
    f("stat3Value", "Number 3", "L5", 12), f("stat3Label", "Label 3", "Software Development", 40),
    f("stat4Value", "Number 4", "", 12), f("stat4Label", "Label 4", "", 40),
  ] },
  { key: "whatIBuild", label: "What I build", description: "Three cards that say what you do.", ready: false, defaultEnabled: true, fields: [
    f("title", "Heading", "What I build", 60),
    f("card1Title", "Card 1 title", "Full-stack products", 60), f("card1Text", "Card 1 text", "From the database to the interface: React, Next.js, Node and MongoDB.", 200, true),
    f("card2Title", "Card 2 title", "Security-minded engineering", 60), f("card2Text", "Card 2 text", "Logins, secrets and hardening are handled before launch, not after.", 200, true),
    f("card3Title", "Card 3 title", "Reliable delivery", 60), f("card3Text", "Card 3 text", "Deployment and monitoring so it keeps working when nobody is watching.", 200, true),
  ] },
  { key: "journey", label: "Journey", description: "A scrolling timeline of how you got here, drawn from your Museum stories.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "The journey so far", 60), f("intro", "Intro", "Every step was a decision to do the work.", 200, true)] },
  { key: "featured", label: "Featured work", description: "Your best projects as problem, action and result.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Selected work", 60), f("intro", "Intro", "A few projects, told as problem, action and result.", 200, true)] },
  { key: "cardWall", label: "Card wall", description: "Many floating image cards to explore.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Wander around", 60), f("intro", "Intro", "Pick a card. Each one opens a small story.", 200, true)] },
  { key: "dispatches", label: "Dispatches (news)", description: "Your latest short updates.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Latest from the HQ", 60)] },
  { key: "gallery", label: "Gallery teaser", description: "A strip of your gallery photos with a link to the full gallery.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "From the gallery", 60), f("intro", "Intro", "Pictures from places and moments I keep.", 200, true)] },
  { key: "hire", label: "Hire band", description: "A wide band that invites serious offers.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Looking for someone to build it?", 80), f("text", "Text", "I take on focused projects and full-time roles. Tell me what you need.", 200, true), f("button", "Button label", "Hire me", 30)] },
  { key: "avatar", label: "Avatar teaser", description: "Introduces the floating avatar that answers questions about you.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Ask my avatar", 60), f("text", "Text", "Curious about my work, my skills or my availability? Ask. It only tells what I allow.", 200, true)] },
  { key: "now", label: "Now", description: "What you are building and learning right now, and whether you are available.", ready: false, defaultEnabled: true, fields: [f("title", "Heading", "Right now", 60), f("building", "Building", "My virtual headquarters", 120), f("learning", "Learning", "Security and systems thinking", 120), f("status", "Availability", "Open to the right opportunity", 80)] },
];

export const BLOCK_BY_KEY = new Map(BLOCK_DEFS.map((d) => [d.key, d]));

export type StoredBlock = { key: string; enabled?: boolean; order?: number; content?: Record<string, unknown> };
export type ResolvedBlock = { key: string; enabled: boolean; order: number; ready: boolean; content: Record<string, string> };

const clean = (v: unknown, fld: BlockField): string => (typeof v === "string" && v.trim().length <= fld.max ? v.trim() : fld.default);

/** Pure: the owner's saved settings over the defaults, in order. Unknown blocks are dropped, missing ones get defaults. */
export function resolveBlocks(stored: readonly StoredBlock[] | null | undefined): ResolvedBlock[] {
  const saved = new Map<string, StoredBlock>();
  for (const s of Array.isArray(stored) ? stored : []) if (s && typeof s.key === "string" && BLOCK_BY_KEY.has(s.key) && !saved.has(s.key)) saved.set(s.key, s);
  const rows = BLOCK_DEFS.map((d, index) => {
    const s = saved.get(d.key);
    const order = s && typeof s.order === "number" && Number.isFinite(s.order) ? s.order : index * 10;
    const content: Record<string, string> = {};
    for (const fld of d.fields) content[fld.name] = clean(s?.content?.[fld.name], fld);
    return { index, order, block: { key: d.key, enabled: d.required ? true : typeof s?.enabled === "boolean" ? s.enabled : d.defaultEnabled, ready: d.ready, content } };
  });
  rows.sort((a, b) => a.order - b.order || a.index - b.index);
  return rows.map((r, position) => ({ ...r.block, order: position }));
}

/** The blocks the public Home shows: switched on and already built, in the owner's order. */
export const visibleBlocks = (blocks: readonly ResolvedBlock[]): ResolvedBlock[] => blocks.filter((b) => b.enabled && b.ready);

/** Checks what the Office sends when saving the layout. The position in the list is the order. */
export function validateBlocksInput(input: unknown): { ok: true; blocks: StoredBlock[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0 || input.length > BLOCK_DEFS.length) return { ok: false, error: "Send the list of blocks." };
  const seen = new Set<string>();
  const blocks: StoredBlock[] = [];
  for (const [i, raw] of input.entries()) {
    const b = raw as { key?: unknown; enabled?: unknown; content?: unknown } | null;
    const def = typeof b?.key === "string" ? BLOCK_BY_KEY.get(b.key) : undefined;
    if (!b || !def) return { ok: false, error: "One of the blocks is not known." };
    if (seen.has(def.key)) return { ok: false, error: `The block "${def.label}" appears twice.` };
    seen.add(def.key);
    if (typeof b.enabled !== "boolean") return { ok: false, error: `Say whether "${def.label}" is on or off.` };
    if (def.required && !b.enabled) return { ok: false, error: `"${def.label}" cannot be switched off.` };
    const content: Record<string, string> = {};
    if (b.content !== undefined && (typeof b.content !== "object" || b.content === null || Array.isArray(b.content))) return { ok: false, error: `The text of "${def.label}" is not valid.` };
    for (const [name, v] of Object.entries((b.content ?? {}) as Record<string, unknown>)) {
      const fld = def.fields.find((x) => x.name === name);
      if (!fld) return { ok: false, error: `"${def.label}" has no field called ${name}.` };
      if (typeof v !== "string") return { ok: false, error: `"${fld.label}" must be text.` };
      if (v.trim().length > fld.max) return { ok: false, error: `"${fld.label}" is too long (${fld.max} characters at most).` };
      content[name] = v.trim();
    }
    blocks.push({ key: def.key, enabled: b.enabled, order: i, content });
  }
  return { ok: true, blocks };
}

/** Moves one block up (-1) or down (+1) in a list. Out-of-range moves change nothing. */
export function moveBlock<T extends { key: string }>(list: readonly T[], key: string, delta: -1 | 1): T[] {
  const i = list.findIndex((b) => b.key === key);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= list.length) return [...list];
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}
