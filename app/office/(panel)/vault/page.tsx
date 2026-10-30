import { Placeholder } from "@/components/office/Placeholder";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return <Placeholder title="Vault" phase="P09">Zero-knowledge storage for your .env files.</Placeholder>;
}
