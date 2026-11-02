/** The kinds of Museum item. Kept in its own file so client code and plain tests can use it without the database. */
export const ITEM_TYPES = ["project", "certificate", "story", "book", "reference"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];
