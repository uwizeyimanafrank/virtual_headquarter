import { Placeholder } from "@/components/office/Placeholder";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return <Placeholder title="Developer" phase="P08">Monitor your databases, media storage and hosting.</Placeholder>;
}
