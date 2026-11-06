import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One encrypted vault entry. `payload` is the string made in the BROWSER by lib/vault-crypto.ts
 * (name and value are both inside the encryption). The server has no key and no readable text here.
 */
const schema = new Schema(
  { payload: { type: String, required: true, maxlength: 65536 } },
  { timestamps: true },
);

export type VaultEntryDoc = InferSchemaType<typeof schema>;
export const VaultEntry: Model<VaultEntryDoc> = (models.VaultEntry as Model<VaultEntryDoc>) || model<VaultEntryDoc>("VaultEntry", schema);
