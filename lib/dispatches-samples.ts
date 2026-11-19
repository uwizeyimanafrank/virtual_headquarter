/** Three obviously fake dispatches shown until the owner writes real ones (P13-T02). Marked isSample in the database. */
const NOTE = " (SAMPLE: replace it from the Office > Dispatches.)";

export const SAMPLE_DISPATCHES = [
  { title: "Sample: Now building", kind: "building", text: "Say what you are building this week, in one or two lines." + NOTE },
  { title: "Sample: Learning this month", kind: "learning", text: "A skill or tool you are practising right now." + NOTE },
  { title: "Sample: A small win", kind: "win", text: "Something that worked, however small." + NOTE },
] as const;
