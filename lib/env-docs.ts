/** Plain-words explanation of every environment variable (used by the Config Doctor). No values here. */
export type EnvDoc = { key: string; need: "always" | "production" | "feature"; feature: string; why: string };

export const ENV_DOCS: EnvDoc[] = [
  { key: "MONGODB_URI", need: "always", feature: "Database", why: "Where all your content, messages and logins are stored." },
  { key: "APP_URL", need: "production", feature: "Cookies and links", why: "The public address of this server. It decides if login cookies are Secure (https) and which sites may call the API." },
  { key: "SESSION_SECRET", need: "production", feature: "Privacy of logs", why: "Salts the stored IP hashes so they can't be reversed. Required in production." },
  { key: "ADMIN_ROUTE_SLUG", need: "always", feature: "Office address", why: "The secret address of the Office. If missing or invalid the Office is switched off." },
  { key: "ADMIN_BOOTSTRAP_HASH", need: "feature", feature: "First login", why: "Lets the very first login create your owner account. You can remove it afterwards." },
  { key: "SERVICE_CRED_KEY", need: "always", feature: "Encrypting 2FA and service secrets", why: "Encrypts your 2FA secret now and your monitored-service credentials later. If it is lost, 2FA must be reset." },
  { key: "CLOUDINARY_CLOUD_NAME", need: "feature", feature: "Image uploads", why: "Your Cloudinary account name. Needed for uploading and showing images." },
  { key: "CLOUDINARY_API_KEY", need: "feature", feature: "Image uploads", why: "Identifies your Cloudinary account when uploading." },
  { key: "CLOUDINARY_API_SECRET", need: "feature", feature: "Image uploads", why: "Signs uploads so only you can upload. Never shown in the browser." },
  { key: "GEMINI_API_KEY", need: "feature", feature: "AI Twin", why: "Lets the AI Twin talk. Needed from phase P07." },
  { key: "ALLOWED_ORIGINS", need: "feature", feature: "Other sites calling the API", why: "Only needed if another website (not this server) must call your API." },
  { key: "COOKIE_DOMAIN", need: "feature", feature: "Cookies across subdomains", why: "Only needed if cookies must be shared between subdomains." },
];
