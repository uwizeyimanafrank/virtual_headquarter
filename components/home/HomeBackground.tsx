/** Slow drifting colour glows behind the page. Pure CSS, GPU-friendly, switched off for reduced motion. */
export function HomeBackground() {
  const blob = "absolute rounded-full blur-3xl motion-safe:animate-[drift_22s_ease-in-out_infinite]";
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className={`${blob} -left-24 top-[-10%] h-[28rem] w-[28rem] bg-accent/20`} />
      <div className={`${blob} -right-32 top-[30%] h-[32rem] w-[32rem] bg-indigo-500/15`} style={{ animationDelay: "-7s" }} />
      <div className={`${blob} bottom-[-15%] left-[25%] h-[26rem] w-[26rem] bg-fuchsia-500/10`} style={{ animationDelay: "-14s" }} />
    </div>
  );
}
