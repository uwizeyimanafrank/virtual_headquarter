import { CursorGlow } from "@/components/site/CursorGlow";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { effectsCss } from "@/lib/effects";
import { getEffects } from "@/lib/effects-server";

/** Puts on the polish effects the owner left on, and a few CSS lines that switch off the rest (Office > Settings > Look and feel). */
export async function SiteEffects() {
  const e = await getEffects();
  const css = effectsCss(e);
  return (
    <>
      {e.scrollProgress && <ScrollProgress />}
      {e.cursorGlow && <CursorGlow />}
      {css && <style>{css}</style>}
    </>
  );
}
