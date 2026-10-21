export function BilingualName({
  english,
  spanish,
  pending = false,
  className,
}: {
  english: string;
  spanish?: string | null;
  pending?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="block">{english}</span>
      {spanish ? (
        <span className="mt-1 block text-[var(--color-cj-muted)]">{spanish}</span>
      ) : pending ? (
        <span className="mt-1 block text-[11px] text-[var(--color-cj-faint)]">Traduciendo…</span>
      ) : null}
    </span>
  );
}
