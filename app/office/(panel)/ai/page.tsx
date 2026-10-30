import { Placeholder } from "@/components/office/Placeholder";
import { requireAdmin } from "@/lib/auth-guard";

export default async function Page() {
  await requireAdmin(); // first line of every Office page
  return <Placeholder title="AI Twin" phase="P07">Your Gemini-powered assistant.</Placeholder>;
}
