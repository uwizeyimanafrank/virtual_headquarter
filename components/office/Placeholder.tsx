export function Placeholder({ title, phase, children }: { title: string; phase: string; children?: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-prose text-muted">{children ?? "This area is being built."}</p>
      <p className="mt-4 inline-block rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">coming in {phase}</p>
    </section>
  );
}
