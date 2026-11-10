import type { ReactNode } from "react";
import type { ResolvedBlock } from "@/lib/home-blocks";

/**
 * Renders the Home blocks in the owner's order. A block is shown only if it is switched on AND has a component here.
 * To add a block: build its component, put it in `components` (from page.tsx), and set ready: true in lib/home-blocks.ts.
 */
export function HomeBlocks({ blocks, components }: { blocks: readonly ResolvedBlock[]; components: Record<string, (b: ResolvedBlock) => ReactNode> }) {
  return (
    <>
      {blocks.map((b) => {
        const render = components[b.key];
        return render ? <div key={b.key} data-block={b.key}>{render(b)}</div> : null;
      })}
    </>
  );
}
